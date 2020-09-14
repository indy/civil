import { h, html, Link, useState, useEffect } from '/js/ext/library.js';

import { useStateValue } from '/js/lib/StateProvider.js';
import Net from '/js/lib/Net.js';
import { useWasmInterface } from '/js/lib/WasmInterfaceProvider.js';

import CivilSelect from '/js/components/CivilSelect.js';
import ImageWidget from '/js/components/ImageWidget.js';

export default function Note(props) {
  const [showModButtons, setShowModButtons] = useState(false);
  const [showAddDecksUI, setShowAddDecksUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [state, dispatch] = useStateValue();

  const [note, setNote] = useState({
    content: props.note.content,
    title: props.note.title || '',
    separator: props.note.separator
  });

  // decks is in whatever structure is most convenient for the CreatableSelect component
  const [decks, setDecks] = useState(buildCurrentDecks(props.note));
  // const [decksSelectRef] = useState(React.createRef());

  useEffect(() => {
    // if(showAddDecksUI && decksSelectRef.current) {
    //   decksSelectRef.current.focus();
    // }
  });

  function handleChangeEvent(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    let newNote = {...note};
    newNote[name] = value;

    setNote(newNote);
  };

  function onSeparatorToggle(event) {
    setNote({
      ...note,
      separator: !note.separator
    });
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
        <label for="separator">Separator</label>

        <input id="separator"
               type="checkbox"
               name="separator"
               value=${ note.separator && "separator"}
               onInput=${ onSeparatorToggle }
               checked=${ note.separator }/>
        <br />
        <label for="title">Title:</label>
        <input id="title"
               type="text"
               name="title"
               value=${ note.title }
               onInput=${ handleChangeEvent } />
        <br/>
        <label for="content">Content:</label>
        <textarea id="content"
                  type="text"
                  name="content"
                  value=${ note.content }
                  onInput=${ handleChangeEvent }/>
        <${ImageWidget}/>
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

    return html`
      <div>
        <button onClick=${ onEditClicked }>${ editLabelText }</button>
        ${ isEditing && html`<button onClick=${ (e) => { onDeleteClicked(e, props.note.id, props.onDelete);} }>Delete</button>` }
        ${ !isEditing && html`<button onClick=${ () => { setShowAddDecksUI(!showAddDecksUI); } }>References...</button>` }
      </div>
`;
  }

  return html`
    <div class="note">
      ${ note.separator && html`<hr/>` }
      ${ isEditing ? buildEditableContent() : buildReadingContent(note, props.note.id, onShowButtonsClicked, props.note.decks, state.imageDirectory) }
      ${ showModButtons && showAddDecksUI && buildAddDecksUI() }
      ${ showModButtons && !showAddDecksUI && buildMainButtons() }
    </div>
`;
}

function buildTitle(title, onShowButtonsClicked) {
  return html`<h2 onClick=${ onShowButtonsClicked }>${ title }</h2>`;
};

function editNote(id, data) {
  const post = {
    id: id,
    ...data
  };

  return Net.put("/api/notes/" + id.toString(), post);
}

function onDeleteClicked(event, id, onDelete) {
  Net.delete("/api/notes/" + id.toString()).then(() => {
    onDelete(id);
  });
  event.preventDefault();
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
      <div class="noteref-entry" key=${ ref.id }>
        <${ResourceLink} id=${ ref.id } name=${ ref.name } resource=${ ref.resource } kind=${ ref.kind }/>
      </div>`;
  });
};

function buildReadingContent(note, noteId, onShowButtonsClicked, decks, imageDirectory) {
  const noteRefContents = buildNoteReference(decks);
  const contentMarkup = buildMarkup(note.content, imageDirectory);

  return html`
    <div>
      ${ note.title && buildTitle(note.title, onShowButtonsClicked) }
      <div class="noteref-container">
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
  let contentChanged = note.content !== propsNote.content;
  let titleChanged = note.title !== (propsNote.title || '');
  let separatorChanged = note.separator !== propsNote.separator;

  return contentChanged || titleChanged || separatorChanged;
};

function ResourceLink({ resource, id, name, kind }) {
  const href = `/${resource}/${id}`;

  let res = html`
      <${Link} href=${ href }><span class="noteref-kind">(${ kind })</span> ${ name }</${Link}>
  `;

  return res;
};
