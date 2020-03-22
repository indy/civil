import React, { useState } from 'react';
import Autocomplete from 'react-autocomplete';
import ResourceLink from './ResourceLink';

import NoteUtils from '../lib/NoteUtils';
import NoteCompiler from '../lib/NoteCompiler';
import Net from '../lib/Net';

export default function Note(props) {
  const [showMainButtons, setShowMainButtons] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [showAddPersonReferenceUI, setShowAddPersonReferenceUI] = useState(false);
  const [showAddSubjectReferenceUI, setShowAddSubjectReferenceUI] = useState(false);
  let   [isEditing, setIsEditing] = useState(false);
  const [currentPersonReference, setCurrentPersonReference] = useState('');
  const [currentSubjectReference, setCurrentSubjectReference] = useState('');
  const [content, setContent] = useState(props.note.content);
  const [source, setSource] = useState(props.note.source || '');
  const [annotation, setAnnotation] = useState(props.note.annotation || '');
  const [separator, setSeparator] = useState(props.note.separator);

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "annotation") {
      setAnnotation(value);
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
    isEditing = !isEditing;
    setIsEditing(isEditing);

    if (isEditing === true) {
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
          annotation,
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

  const buildAnnotation = () => {
    return (
      <span className="marginnote">{ annotation }</span>
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
        { annotation && buildAnnotation() }
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
    let annotationChanged = annotation !== (props.note.annotation || '');
    let separatorChanged = separator !== props.note.separator;

    return contentChanged || sourceChanged || annotationChanged || separatorChanged;
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


  const matchNameToTerm = (state, value) =>  {
    return (
      state.name.toLowerCase().indexOf(value.toLowerCase()) !== -1
    );
  };

  const sortNames = (a, b, value) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    const valueLower = value.toLowerCase();
    const queryPosA = aLower.indexOf(valueLower);
    const queryPosB = bLower.indexOf(valueLower);

    if (queryPosA !== queryPosB) {
      return queryPosA - queryPosB;
    }
    return aLower < bLower ? -1 : 1;
  };

  const postEdgeCreate = (data) => {
    Net.post("/api/edges", data).then(() => {
      // re-fetches the person/subject/article/point
      props.onAddReference();
    });
  };

  const buildEditButtons = () => {
    return (
      <div>
        <button onClick={ (event) => { onDeleteClicked(event);} }>Delete</button>
        <br/>
        <label htmlFor="annotation">Annotation:</label>
        <input id="annotation"
               type="text"
               name="annotation"
               value={ annotation }
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
    const renderMenu = (children) => (
      <div className="menu">{ children }</div>
    );

    const renderItem = (item, isHighlighted) => (
      <div style={{ background: isHighlighted ? 'lightgray' : 'white' }}
           key={ item.id }>
        { item.name }
      </div>
    );

    const toggleAddPersonReferenceUI = () => {
      setShowAddPersonReferenceUI(!showAddPersonReferenceUI);
    };

    const toggleAddSubjectReferenceUI = () => {
      setShowAddSubjectReferenceUI(!showAddSubjectReferenceUI);
    };

    const addPersonReference = () => {
      const person = props.people.find(p => p.name === currentPersonReference);

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
      setCurrentPersonReference("");
    };

    const addSubjectReference = () => {
      const subject = this.props.subjects.find(s => s.name === currentSubjectReference);

      if (subject) {
        this.postEdgeCreate({
          note_id: props.note.id,
          subject_id: subject.id
        });
      } else {
        console.log('no such subject found in subjects');
      }

      setShowMainButtons(false);
      setShowAddSubjectReferenceUI(false);
      setCurrentSubjectReference("");
    };

    if (showAddPersonReferenceUI) {
      return (
        <div>
          <label>Add Person:</label>
          <Autocomplete
            getItemValue={(item) => item.name}
            items={ props.people }
            value={ currentPersonReference }
            wrapperStyle={{ position: 'relative', display: 'inline-block' }}
            shouldItemRender={ matchNameToTerm }
            sortItems={ sortNames }
            onChange={(event, value) => {
              setCurrentPersonReference(value);
            }}
            onSelect={(value) => {
              setCurrentPersonReference(value);
            }}
            renderMenu={ renderMenu }
            renderItem={ renderItem }
            />
            <button onClick={ toggleAddPersonReferenceUI }>Cancel</button>
            <button onClick={ addPersonReference }>Add</button>
        </div>
      );
    } else if (showAddSubjectReferenceUI) {
      return (
        <div>
          <label>Add Subject:</label>
          <Autocomplete
            getItemValue={(item) => item.name}
            items={ props.subjects }
            value={ currentSubjectReference }
            wrapperStyle={{ position: 'relative', display: 'inline-block' }}
            shouldItemRender={ matchNameToTerm }
            sortItems={ sortNames }
            onChange={(event, value) => {
              setCurrentSubjectReference(value);
            }}
            onSelect={(value) => {
              setCurrentSubjectReference(value);
            }}
            renderMenu={ renderMenu }
            renderItem={ renderItem }
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
