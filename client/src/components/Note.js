import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import ResourceLink from './ResourceLink';
import NoteCompiler from '../lib/NoteCompiler';
import Net from '../lib/Net';
import { separateIntoIdeasAndDecks } from '../lib/utils';

export default function Note(props) {
  const [showModButtons, setShowModButtons] = useState(false);
  const [showAddDecksUI, setShowAddDecksUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [note, setNote] = useState({
    content: props.note.content,
    title: props.note.title || '',
    separator: props.note.separator,
    sidenote: props.note.sidenote || ''
  });

  const [decks, setDecks] = useState(buildCurrentDecksAndIdeas(props.note));
  const [decksSelectRef] = useState(React.createRef());

  useEffect(() => {
    if(showAddDecksUI && decksSelectRef.current) {
      decksSelectRef.current.focus();
    }
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
    return (
      <div>
        <label htmlFor="separator">Separator</label>
        <input id="separator"
               type="checkbox"
               name="separator"
               value={ note.separator && "separator"}
               onChange={ onSeparatorToggle }/>
        <br />
        <label htmlFor="title">Title:</label>
        <input id="title"
               type="text"
               name="title"
               value={ note.title }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="content">Content:</label>
        <textarea id="content"
                  type="text"
                  name="content"
                  value={ note.content }
                  onChange={ handleChangeEvent }/>
        <br/>
        <label htmlFor="sidenote">Sidenote:</label>
        <textarea id="sidenote"
                  type="text"
                  name="sidenote"
                  value={ note.sidenote }
                  onChange={ handleChangeEvent } />
      </div>
    );
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

      setDecks(buildCurrentDecksAndIdeas(props.note));
      setShowAddDecksUI(false);
    };

    function commitAddDecks() {
      addDecks(props.note, decks, props.onDecksChanged);

      setShowModButtons(false);
      setShowAddDecksUI(false);
    };

    return (
      <div>
        <label>Decks:</label>
        <CreatableSelect
          ref={ decksSelectRef }
          isMulti
          name="decks"
          value={ decks }
          onChange={ setDecks }
          options={ props.ac.decks }
          className="basic-multi-select"
          classNamePrefix="select"
        />
        <button onClick={ cancelAddDecks }>Cancel</button>
        <button onClick={ commitAddDecks }>Save</button>
      </div>
    );
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

    return (
      <div>
        <button onClick={ onEditClicked }>{ editLabelText }</button>
        { isEditing && <button onClick={ (e) => { onDeleteClicked(e, props.note.id, props.onDelete);} }>Delete</button> }
        { !isEditing && <button onClick={ () => { setShowAddDecksUI(!showAddDecksUI); } }>References...</button> }
      </div>
    );
  }

  return (
    <div className="note">
      { note.separator && <hr/> }
      { isEditing ? buildEditableContent() : buildReadingContent(note, onShowButtonsClicked, props.note.decks, props.note.ideas) }
      { showModButtons && showAddDecksUI && buildAddDecksUI() }
      { showModButtons && !showAddDecksUI && buildMainButtons() }
    </div>
  );
}

function buildTitle(title, onShowButtonsClicked) {
  return (
    <h2 onClick={ onShowButtonsClicked }>{ title }</h2>
  );
};

function buildHandwrittenMargin(sidenote) {
  // only ever going to be one sidenote per paragraph so it's ok to hard code a key value here.
  return (
    <span className="marginnote civil-sidenote" key={ 0 }>
      { sidenote }
    </span>
  );
}

function buildLeftMarginConnections(marginConnections) {
  const containerName = "leftmargin-container";
  const itemName = "leftmargin-entry";
  const spacer = "leftmargin-spacer";

  const referenced = marginConnections.map(s => {
    return (
      <div className={ itemName } key={ s.id }>
        <ResourceLink id={ s.id } name={ s.name } resource={ s.resource }/>
        {spacer && <span className={ spacer }/>}
      </div>
    );
  });

  return (
    <div className={ containerName }>
      { referenced }
    </div>
  );
};

function buildRightMarginConnections(marginConnections) {
  const referenced = marginConnections.map(s => {
    return (
      <span className="marginnote" key={ s.id }>
        <ResourceLink id={ s.id } name={ s.name } resource={ s.resource }/>
      </span>
    );
  });

  return referenced;
};

function constructNoteContent(text, marginalContent, handwrittenMargin) {
  const tokensRes = NoteCompiler.tokenise(text);
  if (tokensRes.tokens === undefined) {
    console.log(`Error tokenising: "${text}"`);
    return null;
  }
  const tokens = tokensRes.tokens;

  const parserRes = NoteCompiler.parse(tokens);
  if (parserRes.nodes === undefined) {
    console.log(`Error parsing: "${tokens}"`);
    return null;
  }

  const ast = parserRes.nodes;
  const dom = NoteCompiler.compile(ast);

  // HACK: assuming that the marginalContent is only applicable to the first p tag
  //
  if (dom[0].type === "p") {
    let kids = dom[0].props.children;

    if (handwrittenMargin) {
      kids.unshift(handwrittenMargin);
    }
    if (marginalContent) {
      // add the marginal notes before the text contents of the p tag
      marginalContent.reverse().forEach(mc => { kids.unshift(mc);});
    }
  }

  return dom;
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


function buildCurrentDecksAndIdeas(note) {
  let res = [];

  if(!note) {
    return null;
  }

  if (note.decks) {
    note.decks.forEach((deck) => {
      res.push({
        id: deck.id,
        value: deck.name,
        label: deck.name,
        resource: deck.resource
      });
    });
  }

  if (note.ideas) {
    note.ideas.forEach((deck) => {
      res.push({
        id: deck.id,
        value: deck.name,
        label: deck.name,
        resource: deck.resource
      });
    });
  }

  return res;
}

function buildReadingContent(note, onShowButtonsClicked, decks, ideas) {
  let marginalContent = ideas ? buildRightMarginConnections(ideas) : undefined;
  let handwrittenMargin = note.sidenote ? buildHandwrittenMargin(note.sidenote) : undefined;

  return (
    <div>
      { note.title && buildTitle(note.title, onShowButtonsClicked) }
      { decks && buildLeftMarginConnections(decks) }
      <div onClick={ onShowButtonsClicked }>
        { constructNoteContent(note.content, marginalContent, handwrittenMargin) }
      </div>
    </div>
  );
};


function addDecks(propsNote, decks, onDecksChanged) {
  let data = {
    note_id: propsNote.id,
    existing_deck_ids: [],
    new_deck_names: []
  };

  // decks would be null if we've removed all decks from a note
  if (decks) {
    data = decks.reduce((acc, deck) => {
      if (deck.__isNew__) {
        acc.new_deck_names.push(deck.value);
      } else if (deck.id) {
        acc.existing_deck_ids.push(deck.id);
      } else {
        // should never get here
        console.error(`deck ${deck.value} has neither __isNew__ nor an id ???`);
        console.log(deck);
      }
      return acc;
    }, data);
  }

  Net.post("/api/edges/notes_decks", data).then((all_decks_for_note) => {
    let [ideas, decks] = separateIntoIdeasAndDecks(all_decks_for_note);
    const n = {
      ...propsNote,
      ideas,
      decks
    };

    onDecksChanged(n);
  });
}

function hasNoteBeenModified(note, propsNote) {
  let contentChanged = note.content !== propsNote.content;
  let titleChanged = note.title !== (propsNote.title || '');
  let separatorChanged = note.separator !== propsNote.separator;
  let sidenoteChanged = note.sidenote !== (propsNote.sidenote || '');

  return contentChanged || titleChanged || separatorChanged || sidenoteChanged;
};
