import React, { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import ResourceLink from './ResourceLink';
import NoteUtils from '../lib/NoteUtils';
import NoteCompiler from '../lib/NoteCompiler';
import Net from '../lib/Net';


// see https://react-select.com/creatable
const colourOptions = [
  { value: 'ocean', label: 'Ocean', color: '#00B8D9', isFixed: true },
  { value: 'blue', label: 'Blue', color: '#0052CC', isDisabled: true },
  { value: 'purple', label: 'Purple', color: '#5243AA' },
  { value: 'red', label: 'Red', color: '#FF5630', isFixed: true },
  { value: 'orange', label: 'Orange', color: '#FF8B00' },
  { value: 'yellow', label: 'Yellow', color: '#FFC400' },
  { value: 'green', label: 'Green', color: '#36B37E' },
  { value: 'forest', label: 'Forest', color: '#00875A' },
  { value: 'slate', label: 'Slate', color: '#253858' },
  { value: 'silver', label: 'Silver', color: '#666666' },
];

export default function Note(props) {
  const [showMainButtons, setShowMainButtons] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [showAddPersonReferenceUI, setShowAddPersonReferenceUI] = useState(false);
  const [showAddSubjectReferenceUI, setShowAddSubjectReferenceUI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(props.note.content);
  const [source, setSource] = useState(props.note.source || '');
  const [title, setTitle] = useState(props.note.title || '');
  const [separator, setSeparator] = useState(props.note.separator);
  const [currentPersonReference, setCurrentPersonReference] = useState(null);
  const [currentSubjectReference, setCurrentSubjectReference] = useState(null);

  const getOptionLabel = (option) => {
    return option.name;
  };

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setTitle(value);
    } else if (name === "source") {
      setSource(value);
    }
  };

  const handleTextAreaChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setContent(value);
  };

  const onSeparatorToggle = (event) => {
    setSeparator(!separator);
  };

  const onDeleteClicked = (event) => {
    const onDelete = props.onDelete;
    const note = props.note;
    const id = note.id;

    NoteUtils.deleteNote(id);

    event.preventDefault();

    onDelete(id);
  };

  const onEditClicked = () => {
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

  const onShowButtonsClicked = () => {
    setShowMainButtons(!showMainButtons);
  };

  const buildSource = () => {
    return (
      <span className="marginnote">
          src: <a href={ source }>{ source }</a>
      </span>
    );
  };

  const buildTitle = () => {
    return (
      <h2>{ title }</h2>
    );
  };

  const buildReferencedSubjects = () => {
    const referenced = props.referencedSubjects.map(s => {
      return (
        <span className="marginnote" key={ s.id }>
          <ResourceLink id={ s.id } name={ s.name } resource='subjects'/>
        </span>
      );
    });

    return referenced;
  };

  const buildReferencedPeople = () => {
    const referenced = props.referencedPeople.map(p => {
      return (
        <span className="marginnote" key={ p.id }>
          <ResourceLink id={ p.id } name={ p.name } resource='people'/>
        </span>
      );
    });

    return referenced;
  };

  const parseContent = (text) => {
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

  const buildNonEditableContent = () => {
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

  const buildEditableContent = () => {
    return (
      <textarea id="text"
                type="text"
                name="text"
                value={ content }
                onChange={ handleTextAreaChangeEvent }/>
    );
  };

  const hasNoteBeenModified = () => {
    let contentChanged = content !== props.note.content;
    let sourceChanged = source !== (props.note.source || '');
    let titleChanged = title !== (props.note.title || '');
    let separatorChanged = separator !== props.note.separator;

    return contentChanged || sourceChanged || titleChanged || separatorChanged;
  };


  const buildEditLabelText = () => {
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

  const postEdgeCreate = (data) => {
    Net.post("/api/edges/notes_decks", data).then(() => {
      // re-fetches the person/subject/article/point
      props.onAddReference();
    });
  };

  const buildEditButtons = () => {
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

  const buildMainButtons = () => {
    const toggleAddPersonReferenceUI = () => {
      setShowAddPersonReferenceUI(!showAddPersonReferenceUI);
    };

    const toggleAddSubjectReferenceUI = () => {
      setShowAddSubjectReferenceUI(!showAddSubjectReferenceUI);
    };

    const addPersonReference = () => {
      // const person = props.people.find(p => p.name === currentPersonReference);
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

    function fookHandleChange(newValue, actionMeta) {
      console.group('Value Changed');
      console.log(newValue);
      console.log(`action: ${actionMeta.action}`);
      console.groupEnd();
    };

    const addSubjectReference = () => {
      // const subject = props.subjects.find(s => s.name === currentSubjectReference);
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

    if (showAddPersonReferenceUI) {
      return (
        <div>
          <label>Add Person:</label>
          <Select
            value={currentPersonReference}
            onChange={setCurrentPersonReference}
            options={props.people}
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
            options={props.subjects}
            getOptionLabel={getOptionLabel}
          />
          <button onClick={ toggleAddSubjectReferenceUI }>Cancel</button>
          <button onClick={ addSubjectReference }>Add</button>
        </div>
      );
    } else {
      const addPerson = <button onClick={ toggleAddPersonReferenceUI }>Add Person...</button>;
      const addSubject = <button onClick={ toggleAddSubjectReferenceUI }>Add Subject...</button>;

      return (
        <div>
          <button onClick={ onEditClicked }>{ buildEditLabelText() }</button>

          <CreatableSelect
            isMulti
            name="colors"
            onChange={fookHandleChange}
            options={colourOptions}
            className="basic-multi-select"
            classNamePrefix="select"
          />

          { !showEditButtons && addPerson }
          { !showEditButtons && addSubject }
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
