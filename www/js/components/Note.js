import { h, html, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';
import { useWasmInterface } from '/js/WasmInterfaceProvider.js';

import CivilSelect from '/js/components/CivilSelect.js';
import ImageWidget from '/js/components/ImageWidget.js';

export default function Note(props) {
  const [showModButtons, setShowModButtons] = useState(false);
  const [showAddDecksUI, setShowAddDecksUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const [state, dispatch] = useStateValue();

  const [note, setNote] = useState({
    content: props.note.content
  });

  // decks is in whatever structure is most convenient for the CreatableSelect component
  const [decks, setDecks] = useState(buildCurrentDecks(props.note));

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

      setDecks(buildCurrentDecks(props.note));
      setShowAddDecksUI(false);
    };

    function commitAddDecks() {
      addDecks(props.note, decks, props.onDecksChanged, dispatch);

      setShowModButtons(false);
      setShowAddDecksUI(false);
    };

    function buildOptionsForCivilSelect(d) {
      return {
        id: d.id,
        resource: d.resource,
        value: d.name,
        compValue: d.name.toLowerCase()
      }
    }

    return html`
      <div>
        <label>Connections:</label>
        <${ CivilSelect }
          parentDeckId=${ props.parentDeckId }
          values=${ decks }
          onChange=${ setDecks }
          onCancelAddDecks=${ cancelAddDecks }
          onCommitAddDecks=${ commitAddDecks }
          options=${ state.ac.decks.map(buildOptionsForCivilSelect) }
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


function buildCurrentDecks(note) {
  let res = [];

  if(!note) {
    return null;
  }
  if (note.decks) {
    note.decks.forEach((deck) => {
      res.push({
        id: deck.id,
        value: deck.name,
        resource: deck.resource,
        kind: deck.kind
      });
    });
  }

  return res;
}

function buildNoteReference(marginConnections) {
  if (!marginConnections) {
    return [];
  }

  return marginConnections.map(ref => {
    return html`
      <div class="spanne-entry" key=${ ref.id }>
        <${ResourceLink} id=${ ref.id } name=${ ref.name } resource=${ ref.resource } kind=${ ref.kind }/>
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



function addDecks(propsNote, decks, onDecksChanged, dispatch) {
  let data = {
    note_id: propsNote.id,
    existing_deck_references: [],
    new_deck_references: []
  };

  // decks would be null if we've removed all decks from a note
  if (decks) {
    data = decks.reduce((acc, deck) => {
      if (deck.__isNew__) {
        acc.new_deck_references.push({name: deck.value, kind: deck.kind });
      } else if (deck.id) {
        acc.existing_deck_references.push({id: deck.id, kind: deck.kind });
      } else {
        // should never get here
        console.error(`deck ${deck.value} has neither __isNew__ nor an id ???`);
        console.log(deck);
      }
      return acc;
    }, data);
  }

  // console.log('sending to server:');
  // console.log(data);

  Net.post("/api/edges/notes_decks", data).then((all_decks_for_note) => {
    let new_deck_names = data.new_deck_references.map(d => d.name);
    updateAutocompleteWithNewDecks(dispatch, new_deck_names, all_decks_for_note);

    const n = {
      ...propsNote,
      decks: all_decks_for_note
    };

    onDecksChanged(n);
  });
}

function updateAutocompleteWithNewDecks(dispatch, newDeckNames, allDecksForNote) {
  let newDecks = [];

  newDeckNames.forEach(name => {
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

function ResourceLink({ resource, id, name, kind }) {
  const href = `/${resource}/${id}`;

  return html`
<div>
  <span class="noteref-kind">(${ kind })</span>
  <${Link} class="noteref pigment-${resource}" href=${ href }>${ name }</${Link}>
</div>`;
};
