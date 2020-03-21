import React, { Component } from 'react';
import Autocomplete from 'react-autocomplete';
import ResourceLink from './ResourceLink';

import NoteUtils from '../lib/NoteUtils';
import NoteCompiler from '../lib/NoteCompiler';
import Net from '../lib/Net';

class Note extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showMainButtons: false,
      showEditButtons: false,
      showAddPersonReferenceUI: false,
      showAddSubjectReferenceUI: false,
      isEditing: false,
      currentPersonReference: "",
      currentSubjectReference: "",
      content: props.note.content,
      source: props.note.source || "",
      annotation: props.note.annotation || "",
      separator: props.note.separator
    };
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    this.setState({
      [name]: value
    });
  }

  handleTextAreaChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    this.setState({ content: value });
  }

  onSeparatorToggle = (event) => {
    this.setState((prevState, props) => ({
      separator: !prevState.separator
    }));
  }

  onDeleteClicked = (event) => {
    const onDelete = this.props.onDelete;
    const note = this.props.note;
    const id = note.id;

    NoteUtils.deleteNote(id);

    event.preventDefault();

    onDelete(id);
  }

  onEditClicked = () => {
    this.setState((prevState, props) => {
      const isEditing = !prevState.isEditing;
      const note = props.note;
      const editedContent = prevState.content;

      let showMainButtons = prevState.showMainButtons;
      let showEditButtons = prevState.showEditButtons;

      if (isEditing === true) {
        showEditButtons = true;
      } else {
        showMainButtons = false;
        showEditButtons = false;
        if (this.hasNoteBeenModified(prevState, props)) {

          const id = note.id;
          const data = {
            content: editedContent,
            source: prevState.source,
            annotation: prevState.annotation,
            separator: prevState.separator
          };

          // send updated content to server
          //
          NoteUtils.editNote(id, data);

          // stopped editing and the editable content is different than
          // the original note's text.
          props.onEdited(note.id, data);
        }
      }

      return {
        isEditing: isEditing,
        showEditButtons: showEditButtons,
        showMainButtons: showMainButtons
      };
    });
  }

  onShowButtonsClicked = () => {
    this.setState((prevState, props) => ({
      showMainButtons: !prevState.showMainButtons
    }));
  }

  buildSource = () => {
    return (
      <span className="marginnote">
          src: <a href={ this.state.source }>{ this.state.source }</a>
      </span>
    );
  }

  buildAnnotation = () => {
    return (
      <span className="marginnote">{ this.state.annotation }</span>
    );
  }

  buildReferencedSubjects = () => {
    const referenced = this.props.referencedSubjects.map(s => {
      return (
        <span className="marginnote" key={ s.id }>
          <ResourceLink id={ s.id } name={ s.name } resource='subjects'/>
        </span>
      );
    });

    return referenced;
  }

  buildReferencedPeople = () => {
    const referenced = this.props.referencedPeople.map(p => {
      return (
        <span className="marginnote" key={ p.id }>
          <ResourceLink id={ p.id } name={ p.name } resource='people'/>
        </span>
      );
    });

    return referenced;
  }

  parseContent = (text) => {

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
  }

  buildNonEditableContent = () => {
    return (
      <div onClick={ this.onShowButtonsClicked }>
        { this.state.annotation && this.buildAnnotation() }
        { this.state.source && this.buildSource() }
        { this.props.referencedSubjects && this.buildReferencedSubjects() }
        { this.props.referencedPeople && this.buildReferencedPeople() }
        { this.parseContent(this.state.content) }
      </div>
    );
  }

  buildEditableContent = () => {
    return (
      <textarea id="text"
                type="text"
                name="text"
                value={ this.state.content }
                onChange={ this.handleTextAreaChangeEvent }/>
    );
  }

  hasNoteBeenModified = (state, props) => {
    function hasChanged(name) {
      if (props.note[name] === undefined || props.note[name] === null) {
        return !!state[name];
      };
      return state[name] !== props.note[name];
    }

    return state.content !== props.note.content ||
      hasChanged("source") ||
      hasChanged("annotation") ||
      state.separator !== props.note.separator;
  }


  buildEditLabelText = () => {
    if (this.state.isEditing === false) {
      return "Edit...";
    }

    if (this.hasNoteBeenModified(this.state, this.props)) {
      // editing and have made changes
      return "Save Edits";
    }

    // editing and haven't made any changes yet
    return "Stop Editing";
  }


  matchNameToTerm = (state, value) =>  {
    return (
      state.name.toLowerCase().indexOf(value.toLowerCase()) !== -1
    );
  }

  sortNames = (a, b, value) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    const valueLower = value.toLowerCase();
    const queryPosA = aLower.indexOf(valueLower);
    const queryPosB = bLower.indexOf(valueLower);

    if (queryPosA !== queryPosB) {
      return queryPosA - queryPosB;
    }
    return aLower < bLower ? -1 : 1;
  }

  postEdgeCreate = (data) => {
    Net.post("/api/edges", data).then(() => {
      // re-fetches the person/subject/article/point
      this.props.onAddReference();
    });
  }

  buildEditButtons = () => {
    const {
      source,
      annotation
    } = this.state;

    return (
      <div>
        <button onClick={ (event) => { this.onDeleteClicked(event);} }>Delete</button>
        <br/>
        <label htmlFor="annotation">Annotation:</label>
        <input id="annotation"
               type="text"
               name="annotation"
               value={ annotation }
               onChange={ this.handleChangeEvent } />
        <br/>
        <label htmlFor="source">Source:</label>
        <input id="source"
               type="text"
               name="source"
               value={ source }
               onChange={ this.handleChangeEvent } />
        <br/>
        <label htmlFor="separator">Separator</label>
        <input id="separator"
               type="checkbox"
               name="separator"
               value={ this.state.separator && "separator"}
               onChange={ this.onSeparatorToggle }/>
      </div>
    );
  }

  buildMainButtons = () => {
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
      this.setState((prevState, props) => ({
        showAddPersonReferenceUI: !prevState.showAddPersonReferenceUI
      }));
    };

    const toggleAddSubjectReferenceUI = () => {
      this.setState((prevState, props) => ({
        showAddSubjectReferenceUI: !prevState.showAddSubjectReferenceUI
      }));
    };

    const addPersonReference = () => {
      const name = this.state.currentPersonReference;
      const person = this.props.people.find(p => p.name === name);

      if (person) {
        this.postEdgeCreate({
          note_id: this.props.note.id,
          person_id: person.id
        });
      } else {
        console.log('no such person found in people');
      }

      this.setState({
        showMainButtons: false,
        showAddPersonReferenceUI: false,
        currentPersonReference: ""
      });
    };

    const addSubjectReference = () => {
      const name = this.state.currentSubjectReference;
      const subject = this.props.subjects.find(s => s.name === name);

      if (subject) {
        this.postEdgeCreate({
          note_id: this.props.note.id,
          subject_id: subject.id
        });
      } else {
        console.log('no such subject found in subjects');
      }

      this.setState({
        showMainButtons: false,
        showAddSubjectReferenceUI: false,
        currentSubjectReference: ""
      });
    };

    if (this.state.showAddPersonReferenceUI) {
      return (
        <div>
          <label>Add Person:</label>
          <Autocomplete
            getItemValue={(item) => item.name}
            items={ this.props.people }
            value={ this.state.currentPersonReference }
            wrapperStyle={{ position: 'relative', display: 'inline-block' }}
            shouldItemRender={ this.matchNameToTerm }
            sortItems={ this.sortNames }
            onChange={(event, value) => this.setState({
              currentPersonReference: value
            })}
            onSelect={(value) => this.setState({
              currentPersonReference: value
            })}
            renderMenu={ renderMenu }
            renderItem={ renderItem }
            />
            <button onClick={ toggleAddPersonReferenceUI }>Cancel</button>
            <button onClick={ addPersonReference }>Add</button>
        </div>
      );
    } else if (this.state.showAddSubjectReferenceUI) {
      return (
        <div>
          <label>Add Subject:</label>
          <Autocomplete
            getItemValue={(item) => item.name}
            items={ this.props.subjects }
            value={ this.state.currentSubjectReference }
            wrapperStyle={{ position: 'relative', display: 'inline-block' }}
            shouldItemRender={ this.matchNameToTerm }
            sortItems={ this.sortNames }
            onChange={(event, value) => this.setState({
              currentSubjectReference: value
            })}
            onSelect={(value) => this.setState({
              currentSubjectReference: value
            })}
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
          <button onClick={ this.onEditClicked }>{ this.buildEditLabelText() }</button>
          { !this.state.showEditButtons && addPerson }
          { !this.state.showEditButtons && addSubject }
        </div>
      );
    }
  }

  render() {
    return (
      <div className="note">
        { this.state.separator && <hr/> }
        { this.state.isEditing ? this.buildEditableContent() : this.buildNonEditableContent() }
        { this.state.showEditButtons && this.buildEditButtons() }
        { this.state.showMainButtons && this.buildMainButtons() }
      </div>
    );
  }
}

export default Note;
