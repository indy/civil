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
  const [showAddPersonReferenceUI, setShowAddPersonReferenceUI] = useState(false);
  const [showAddSubjectReferenceUI, setShowAddSubjectReferenceUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(props.note.content);
  const [source, setSource] = useState(props.note.source || '');
  const [title, setTitle] = useState(props.note.title || '');
  const [separator, setSeparator] = useState(props.note.separator);
  const [initialTags, setInitialTags] = useState(props.note.tags || null);
  const [tags, setTags] = useState(props.note.tags || null);
  const [currentPersonReference, setCurrentPersonReference] = useState(null);
  const [currentSubjectReference, setCurrentSubjectReference] = useState(null);

  function getOptionLabel(option) {
    return option.name;
  };

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

  function buildSource() {
    return (
      <span className="marginnote">
          src: <a href={ source }>{ source }</a>
      </span>
    );
  };

  function buildTitle() {
    return (
      <h2>{ title }</h2>
    );
  };

  function buildReferencedSubjects() {
    const referenced = props.referencedSubjects.map(s => {
      return (
        <span className="marginnote" key={ s.id }>
          <ResourceLink id={ s.id } name={ s.name } resource='subjects'/>
        </span>
      );
    });

    return referenced;
  };

  function buildReferencedPeople() {
    const referenced = props.referencedPeople.map(p => {
      return (
        <span className="marginnote" key={ p.id }>
          <ResourceLink id={ p.id } name={ p.name } resource='people'/>
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

  function buildNonEditableContent() {
    return (
      <div onClick={ onShowButtonsClicked }>
        { title && buildTitle() }
        { source && buildSource() }
        { props.referencedSubjects && buildReferencedSubjects() }
        { props.referencedPeople && buildReferencedPeople() }
        { parseContent(content) }
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

  function postEdgeCreate(data) {
    Net.post("/api/edges/notes_decks", data).then(() => {
      // re-fetches the person/subject/article/point
      props.onAddReference();
    });
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

    function toggleAddPersonReferenceUI() {
      setShowAddPersonReferenceUI(!showAddPersonReferenceUI);
    };

    function toggleAddSubjectReferenceUI() {
      setShowAddSubjectReferenceUI(!showAddSubjectReferenceUI);
    };

    function tagsHandleChange(newValue, actionMeta) {
      setTags(newValue);
      console.group('Value Changed');
      console.log(newValue);
      console.log(`action: ${actionMeta.action}`);
      console.groupEnd();
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

      console.log(`pressed cancel setting tags to:`);
      console.log(props.note.tags || null);
      setTags(initialTags);

      setShowAddTagsUI(false);
    };

    function commitAddTags() {
      const data = tags.reduce((acc, tag) => {
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
      }, {
        note_id: props.note.id,
        existing_tag_ids: [],
        new_tag_names: []
      });

      Net.post("/api/edges/notes_tags", data).then(() => {
        // return the new tags? or all tags?
        // add them to the autocomplete list
        // or
        // just have the autcomplete list refresh
      });

      setInitialTags(tags);

      setShowMainButtons(false);
      setShowAddTagsUI(false);
    };

    function addPersonReference() {
      const person = currentPersonReference;

      if (person) {
        postEdgeCreate({
          note_id: props.note.id,
          person_id: person.id
        });
      } else {
        console.log('no such person found in people');
      }

      setShowMainButtons(false);
      setShowAddPersonReferenceUI(false);
      setCurrentPersonReference(null);
    };

    function addSubjectReference() {
      const subject = currentSubjectReference;

      if (subject) {
        postEdgeCreate({
          note_id: props.note.id,
          subject_id: subject.id
        });
      } else {
        console.log('no such subject found in subjects');
      }

      setShowMainButtons(false);
      setShowAddSubjectReferenceUI(false);
      setCurrentSubjectReference(null);
    };

    if (showAddTagsUI) {
      return (
        <div>
          <label>Add Tags:</label>
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
          <button onClick={ commitAddTags }>Add</button>
        </div>
      );
    } else if (showAddPersonReferenceUI) {
      return (
        <div>
          <label>Add Person:</label>
          <Select
            value={currentPersonReference}
            onChange={setCurrentPersonReference}
            options={props.ac.people}
            getOptionLabel={getOptionLabel}
          />
          <button onClick={ toggleAddPersonReferenceUI }>Cancel</button>
          <button onClick={ addPersonReference }>Add</button>
        </div>
      );
    } else if (showAddSubjectReferenceUI) {
      return (
        <div>
          <label>Add Subject:</label>

          <Select
            value={currentSubjectReference}
            onChange={setCurrentSubjectReference}
            options={props.ac.subjects}
            getOptionLabel={getOptionLabel}
          />
          <button onClick={ toggleAddSubjectReferenceUI }>Cancel</button>
          <button onClick={ addSubjectReference }>Add</button>
        </div>
      );
    } else {
      const addTagsButton = <button onClick={ toggleAddTagsUI }>Add Tags...</button>;
      const addPersonButton = <button onClick={ toggleAddPersonReferenceUI }>Add Person...</button>;
      const addSubjectButton = <button onClick={ toggleAddSubjectReferenceUI }>Add Subject...</button>;

      return (
        <div>
          <button onClick={ onEditClicked }>{ buildEditLabelText() }</button>
          { !showEditButtons && addTagsButton }
          { !showEditButtons && addPersonButton }
          { !showEditButtons && addSubjectButton }
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
