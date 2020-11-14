import { h, html, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';
import { useWasmInterface } from '/js/WasmInterfaceProvider.js';

import CivilSelect from '/js/components/CivilSelect.js';
import ImageWidget from '/js/components/ImageWidget.js';

export default function Note(props) {
  const [state, dispatch] = useStateValue();

  const [showModButtons, setShowModButtons] = useState(false);
  const [showAddDecksUI, setShowAddDecksUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [note, setNote] = useState({ content: props.note.content });
  const [decks, setDecks] = useState(props.note && props.note.decks);

  function handleChangeEvent(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    let newNote = {...note};
    newNote[name] = value;

    setNote(newNote);
  };

  function onEditClicked() {
    const isEditingNew = !isEditing;
    setIsEditing(isEditingNew);

    if (isEditingNew === false) {
      setShowModButtons(false);

      if (hasNoteBeenModified(note, props.note)) {
        const id = props.note.id;

        // send updated content to server
        //
        editNote(id, note);

        // stopped editing and the editable content is different than
        // the original note's text.
        props.onEdited(id, note);
      }
    }
  };

  function onShowButtonsClicked() {
    setShowModButtons(!showModButtons);
  };

  function buildEditableContent() {
    let res = html`
      <div class="civil-form">
        <textarea id="content"
                  type="text"
                  name="content"
                  value=${ note.content }
                  onInput=${ handleChangeEvent }/>
      </div>`;

    return res;
  };

  function buildAddDecksUI() {
    function cancelAddDecks() {
      // todo: what if someone:
      // 1. clicks on edit note
      // 2. adds decks
      // 3. clicks ok (these decks should now be associated with the note)
      // 4. clicks on edit note
      // 5. adds more decks
      // 6. clicks cancel
      // expected: only the changes from step 5 should be undone

      setDecks(props.note && props.note.decks);
      setShowAddDecksUI(false);
    };

    function commitAddDecks() {
      addDecks(props.note, decks, props.onDecksChanged, dispatch);

      setShowModButtons(false);
      setShowAddDecksUI(false);
    };

    return html`
      <div>
        <label>Connections:</label>
        <${ CivilSelect }
          parentDeckId=${ props.parentDeckId }
          chosen=${ decks }
          available=${ state.ac.decks }
          onChange=${ setDecks }
          onCancelAddDecks=${ cancelAddDecks }
          onCommitAddDecks=${ commitAddDecks }
        />
      </div>`;
  };

  function buildMainButtons() {
    let editLabelText;
    if (!isEditing) {
      editLabelText = "Edit...";
    } else if (hasNoteBeenModified(note, props.note)) {
      // editing and have made changes
      editLabelText = "Save Edits";
    } else {
      editLabelText = "Stop Editing";
    }

    function eventRegardingDeleteConfirmation(e, newVal) {
      e.preventDefault();
      setShowDeleteConfirmation(newVal);
    }

    function deleteClicked(e) {
      eventRegardingDeleteConfirmation(e, true);
    }
    function confirmDeleteClicked(e) {
      onReallyDelete(props.note.id, props.onDelete);
      eventRegardingDeleteConfirmation(e, false);
    }
    function cancelDeleteClicked(e) {
      eventRegardingDeleteConfirmation(e, false);
    }

    return html`
      <div>
        ${ !showDeleteConfirmation && html`<button onClick=${ onEditClicked }>${ editLabelText }</button>`}
        ${ isEditing && !showDeleteConfirmation && html`<button onClick=${ deleteClicked }>Delete</button>` }
        ${ isEditing && showDeleteConfirmation && html`
                                                    <span class="delete-confirmation">Really Delete?</span>
                                                    <button onClick=${ cancelDeleteClicked }>Cancel</button>
                                                    <button onClick=${ confirmDeleteClicked }>Yes Delete</button>`}
        ${ isEditing && html`<${ImageWidget}/>` }
        ${ !isEditing && html`<button onClick=${ () => { setShowAddDecksUI(!showAddDecksUI); } }>References...</button>` }
      </div>
`;
  }

  return html`
    <div class="note">
      ${ isEditing ? buildEditableContent() : buildReadingContent(note, props.note.id, onShowButtonsClicked, props.note.decks, state.imageDirectory) }
      ${ showModButtons && showAddDecksUI && buildAddDecksUI() }
      ${ showModButtons && !showAddDecksUI && buildMainButtons() }
    </div>
`;
}

function editNote(id, data) {
  const post = {
    id: id,
    ...data
  };

  return Net.put("/api/notes/" + id.toString(), post);
}

function onReallyDelete(id, onDelete) {
  Net.delete("/api/notes/" + id.toString()).then(() => {
    onDelete(id);
  });
};

function buildNoteReference(marginConnections) {
  if (!marginConnections) {
    return [];
  }

  return marginConnections.map(ref => {
    const { id, resource, kind, name, annotation } = ref;
    const href = `/${resource}/${id}`;
    return html`
      <div class="spanne-entry" key=${ id }>
        <span class="noteref-kind">(${ kind })</span>
        <${Link} class="noteref pigment-${ resource }" href=${ href }>${ name }</${Link}>
        ${annotation && html`<div class="noteref-clearer"/>
                             <div class="noteref-annotation pigment-fg-${ resource }">${ annotation }</div>
                             <div class="noteref-clearer"/>`}
      </div>`;
  });
};

function buildReadingContent(note, noteId, onShowButtonsClicked, decks, imageDirectory) {
  const noteRefContents = buildNoteReference(decks);
  const contentMarkup = buildMarkup(note.content, imageDirectory);

  return html`
    <div>
      <div class="spanne">
        ${ noteRefContents }
      </div>
      <div onClick=${ onShowButtonsClicked }>
        ${ contentMarkup }
      </div>
    </div>`;
};

// build the Preact structure from the AST generated by rust
//
function buildMarkup(content, imageDirectory) {
  const wasmInterface = useWasmInterface();
  const astArray = wasmInterface.asHtmlAst(content);

  function attrs(n) {
    let res = {
      key: n.key,
      class: n.class_name,
      for: n.html_for,
      href: n.href,
      type: n.html_type,
      id: n.id
    }

    if (n.src) {
      res.src = `/u/${imageDirectory}/${n.src}`;
    }

    return res;
  }

  function compile(n) {
    return n.name === "text" ? n.text : h(n.name, attrs(n), ...n.children.map(compile));
  }

  return astArray.map(compile);
}

function addDecks(note, decks, onDecksChanged, dispatch) {
  let data = {
    note_id: note.id,
    existing_deck_references: [],
    new_deck_references: []
  };

  // decks would be null if we've removed all decks from a note
  if (decks) {
    data = decks.reduce((acc, deck) => {
      if (deck.__isNew__) {
        acc.new_deck_references.push(deck);
      } else if (deck.id) {
        acc.existing_deck_references.push(deck);
      } else {
        console.error(`deck ${deck.name} has neither __isNew__ nor an id ???`);
        console.error(deck);
      }
      return acc;
    }, data);
  }

  Net.post("/api/edges/notes_decks", data).then((all_decks_for_note) => {
    updateAutocompleteWithNewDecks(dispatch, data.new_deck_references, all_decks_for_note);
    onDecksChanged(note, all_decks_for_note);
  });
}

function updateAutocompleteWithNewDecks(dispatch, newDeckReferences, allDecksForNote) {
  let newDecks = [];

  newDeckReferences.forEach(d => {
    const name = d.name;
    // find the newly created deck in allDecksForNote
    let deck = allDecksForNote.find(d => d.name === name);

    // this deck has just been created, so it isn't in the state's autocomplete list
    if (deck) {
      newDecks.push({
        id: deck.id,
        name: deck.name,
        resource: deck.resource
      });
    } else {
      console.error(`Expected a new deck called '${name}' to have been created by the server`);
    }
  });

  if (newDecks.length > 0) {
    dispatch({
      type: 'addAutocompleteDecks',
      newDecks
    });
  }
}

function hasNoteBeenModified(note, propsNote) {
  return note.content !== propsNote.content;
};
