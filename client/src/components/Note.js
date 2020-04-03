import React, { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import ResourceLink from './ResourceLink';
import NoteUtils from '../lib/NoteUtils';
import NoteCompiler from '../lib/NoteCompiler';
import Net from '../lib/Net';

export default function Note(props) {
  const [showMainButtons, setShowMainButtons] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [showAddTagsUI, setShowAddTagsUI] = useState(false);
  const [showAddDecksUI, setShowAddDecksUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(props.note.content);
  const [source, setSource] = useState(props.note.source || '');
  const [title, setTitle] = useState(props.note.title || '');
  const [separator, setSeparator] = useState(props.note.separator);

  const [tags, setTags] = useState(buildCurrentTags(props.note.tags));
  const [decks, setDecks] = useState(buildCurrentDecks(props.note.decks)); // fix later

  function buildCurrentTags(tagsInNote) {
    let res = [];

    if(!tagsInNote) {
      return null;
    }

    tagsInNote.forEach((tag) => {
      res.push({
        id: tag.id,
        value: tag.name,
        label: tag.name
      });
    });

    return res;
  }

  function buildCurrentDecks(decksInNote) {
    let res = [];

    if(!decksInNote) {
      return null;
    }

    decksInNote.forEach((deck) => {
      res.push({
        id: deck.id,
        value: deck.name,
        label: deck.name,
        resource: deck.resource
      });
    });

    return res;
  }

  function handleChangeEvent(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setTitle(value);
    } else if (name === "source") {
      setSource(value);
    }
  };

  function handleTextAreaChangeEvent(event) {
    const target = event.target;
    const value = target.value;

    setContent(value);
  };

  function onSeparatorToggle(event) {
    setSeparator(!separator);
  };

  function onDeleteClicked(event) {
    const onDelete = props.onDelete;
    const note = props.note;
    const id = note.id;

    NoteUtils.deleteNote(id);

    event.preventDefault();

    onDelete(id);
  };

  function onEditClicked() {
    const isEditingNew = !isEditing;
    setIsEditing(isEditingNew);

    if (isEditingNew === true) {
      setShowEditButtons(true);
    } else {
      setShowMainButtons(false);
      setShowEditButtons(false);

      const note = props.note;
      const editedContent = content;

      if (hasNoteBeenModified()) {
        const id = note.id;
        const data = {
          content: editedContent,
          source,
          title,
          separator
        };

        // send updated content to server
        //
        NoteUtils.editNote(id, data);

        // stopped editing and the editable content is different than
        // the original note's text.
        props.onEdited(note.id, data);
      }
    }
  };

  function onShowButtonsClicked() {
    setShowMainButtons(!showMainButtons);
  };

  function buildNonEditableContent() {
    return (
      <div>
        <div onClick={ onShowButtonsClicked }>
          { title && buildTitle(title) }
          { source && buildSource(source) }
          { parseContent(content) }
        </div>
        { props.note.tags && buildMarginConnections(props.note.tags, "tag") }
        { props.note.decks && buildMarginConnections(props.note.decks, "marginnote") }
      </div>
    );
  };

  function buildEditableContent() {
    return (
      <textarea id="text"
                type="text"
                name="text"
                value={ content }
                onChange={ handleTextAreaChangeEvent }/>
    );
  };

  function hasNoteBeenModified() {
    let contentChanged = content !== props.note.content;
    let sourceChanged = source !== (props.note.source || '');
    let titleChanged = title !== (props.note.title || '');
    let separatorChanged = separator !== props.note.separator;

    return contentChanged || sourceChanged || titleChanged || separatorChanged;
  };


  function buildEditLabelText() {
    if (!isEditing) {
      return "Edit...";
    }

    if (hasNoteBeenModified()) {
      // editing and have made changes
      return "Save Edits";
    }

    // editing and haven't made any changes yet
    return "Stop Editing";
  };

  function buildEditButtons() {
    return (
      <div>
        <button onClick={ (event) => { onDeleteClicked(event);} }>Delete</button>
        <br/>
        <label htmlFor="title">Title:</label>
        <input id="title"
               type="text"
               name="title"
               value={ title }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="source">Source:</label>
        <input id="source"
               type="text"
               name="source"
               value={ source }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="separator">Separator</label>
        <input id="separator"
               type="checkbox"
               name="separator"
               value={ separator && "separator"}
               onChange={ onSeparatorToggle }/>
      </div>
    );
  };

  function buildMainButtons() {
    function toggleAddTagsUI() {
      setShowAddTagsUI(!showAddTagsUI);
    };

    function toggleAddDecksUI() {
      setShowAddDecksUI(!showAddDecksUI);
    };

    function tagsHandleChange(newValue, actionMeta) {
      setTags(newValue);
    };

    function decksHandleChange(newValue, actionMeta) {
      setDecks(newValue);
    };

    function cancelAddTags() {
      // todo: what if someone:
      // 1. clicks on edit note
      // 2. adds tags
      // 3. clicks ok (these tags should now be associated with the note)
      // 4. clicks on edit note
      // 5. adds more tags
      // 6. clicks cancel
      // expected: only the changes from step 5 should be undone

      setTags(buildCurrentTags(props.note.tags));

      setShowAddTagsUI(false);
    };

    function commitAddTags() {
      let data = {
        note_id: props.note.id,
        existing_tag_ids: [],
        new_tag_names: []
      };

      // tags would be null if we've removed all tags from a note
      if (tags) {
        data = tags.reduce((acc, tag) => {
          if (tag.__isNew__) {
            acc.new_tag_names.push(tag.value);
          } else if (tag.id) {
            acc.existing_tag_ids.push(tag.id);
          } else {
            // should never get here
            console.error(`tag ${tag.value} has neither __isNew__ nor an id ???`);
            console.log(tag);
          }
          return acc;
        }, data);
      }

      Net.post("/api/edges/notes_tags", data).then((all_tags_for_note) => {
        const n = {...props.note};
        n.tags = all_tags_for_note.reduce((acc, tag) => {
          acc.push({note_id: n.id, id: tag.id, name: tag.name});
          return acc;
        }, []);
        props.onTagsChanged(n, data.new_tag_names.length > 0);
      });

      setShowMainButtons(false);
      setShowAddTagsUI(false);
    };

    function cancelAddDecks() {
      setDecks(buildCurrentDecks(props.note.decks));
      setShowAddDecksUI(false);
    };

    function commitAddDecks() {
      let data = {
        note_id: props.note.id,
        deck_ids: []
      };

      // decks would be null if we've removed all deck references from a note
      if (decks) {
        data = decks.reduce((acc, deck) => {
          if (deck.id) {
            acc.deck_ids.push(deck.id);
          } else {
            // should never get here
            console.error(`deck ${deck.value} has no id ???`);
            console.log(deck);
          }
          return acc;
        }, data);
      }

      Net.post("/api/edges/notes_decks", data).then((all_decks_for_note) => {
        const n = {...props.note};
        n.decks = all_decks_for_note.reduce((acc, deck) => {
          acc.push({note_id: n.id, id: deck.id, name: deck.name, resource: deck.resource});
          return acc;
        }, []);
        props.onDecksChanged(n);
      });

      setShowMainButtons(false);
      setShowAddDecksUI(false);
    };

    if (showAddTagsUI) {
      return (
        <div>
          <label>Tags:</label>
          <CreatableSelect
            isMulti
            name="tags"
            value={tags}
            onChange={tagsHandleChange}
            options={props.ac.tags}
            className="basic-multi-select"
            classNamePrefix="select"
          />
          <button onClick={ cancelAddTags }>Cancel</button>
          <button onClick={ commitAddTags }>Save</button>
        </div>
      );
    } else if (showAddDecksUI) {
      return (
        <div>
          <label>Decks:</label>
          <Select
            isMulti
            name="decks"
            value={decks}
            onChange={decksHandleChange}
            options={props.ac.decks}
            className="basic-multi-select"
            classNamePrefix="select"
          />
          <button onClick={ cancelAddDecks }>Cancel</button>
          <button onClick={ commitAddDecks }>Save</button>
        </div>
      );
    }  else {
      const addTagsButton = <button onClick={ toggleAddTagsUI }>Tags...</button>;
      const addDecksButton = <button onClick={ toggleAddDecksUI }>References...</button>;

      return (
        <div>
          <button onClick={ onEditClicked }>{ buildEditLabelText() }</button>
          { !showEditButtons && addTagsButton }
          { !showEditButtons && addDecksButton }
        </div>
      );
    }
  };

  return (
    <div className="note">
      { separator && <hr/> }
      { isEditing ? buildEditableContent() : buildNonEditableContent() }
      { showEditButtons && buildEditButtons() }
      { showMainButtons && buildMainButtons() }
    </div>
  );
}

function buildTitle(title) {
  return (
    <h2>{ title }</h2>
  );
};

function buildSource(source) {
  return (
    <span className="marginnote">
      <a href={ source }>{ source }</a>
    </span>
  );
};

function buildMarginConnections(marginConnections, className) {
  const referenced = marginConnections.map(s => {
    return (
      <span className={ className } key={ s.id }>
        <ResourceLink id={ s.id } name={ s.name } resource={ s.resource }/>
      </span>
    );
  });

  return referenced;
};

function parseContent(text) {
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
  return dom;
};
