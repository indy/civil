import React, { Component } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

class Point extends Component {
  constructor (props) {
    super(props);

    this.state = {
      point: {
        id: parseInt(props.match.params.pointId, 10),
        notes: [],
        people_referenced: [],
        subjects_referenced: []
      },
      scratchNote: "",
      showButtons: false,
      showNoteCreateForm: false,
      ac: {
        people: [],
        subjects: []
      },
      referencedSubjectsHash: {},
      referencedPeopleHash: {}
    };

    this.fetchPoint();
    this.fetchAutocompleteLists();
  }

  fetchAutocompleteLists = () => {
    Net.get("/api/autocomplete/people").then(people => {
      if (people) {
        let ac = this.state.ac;
        ac.people = people;
        this.setState({ ac });
      }
    });

    Net.get("/api/autocomplete/subjects").then(subjects => {
      if (subjects) {
        let ac = this.state.ac;
        ac.subjects = subjects;
        this.setState({ ac });
      }
    });
  }

  fetchPoint = () => {
    const id = this.state.point.id;

    Net.get(`/api/point/${id}`).then(point => {
      if (point) {

        const referencedSubjectsHash = point.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHash = point.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        this.setState({ point, referencedPeopleHash, referencedSubjectsHash });
      } else {
        console.error('foooked Point constructor');
      }
    });
  }

  findNoteWithId = (id, modifyFn) => {
    this.setState((prevState, props) => {
      // client-side update the state with the new note content
      //
      const point = prevState.point;
      const notes = point.notes;
      const index = notes.findIndex(n => n.id === id);

      if (index === -1) {
        // assert - should never get here
        console.log(`unable to find index of edited note: ${id}`);
        return {};
      }

      modifyFn(notes, index);

      return {
        point: point
      };
    });

  }

  onEditedNote = (id, data) => {
    this.findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  }

  onDeleteNote = (noteId) => {
    this.findNoteWithId(noteId, (notes, index) => {
      notes.splice(index, 1);
    });
  }

  onAddReference = () => {
    this.fetchPoint();
  }

  buildNoteComponent = (note) => {
    return (
      <Note key={ note.id }
            note={ note }
            people={ this.state.ac.people }
            subjects={ this.state.ac.subjects }
            onDelete={ this.onDeleteNote }
            onEdited={ this.onEditedNote }
            onAddReference={ this.onAddReference }
            referencedPeople={ this.state.referencedPeopleHash[note.id] }
            referencedSubjects={ this.state.referencedSubjectsHash[note.id] }
            />
    );
  }

  buildButtons = () => {
    let onAddNoteClicked = (event) => {
      this.setState((prevState, props) => ({
        showNoteCreateForm: !prevState.showNoteCreateForm
      }));
      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note</button>
      </div>
    );
  }

  buildNoteCreateForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      NoteUtils.addNote(noteForm, { point_id: this.state.point.id })
        .then(() => {
          this.fetchPoint();
          this.setState({
            scratchNote: "",
            showNoteCreateForm: false
          });
        });
    };

    const onChangeNote = (value) => {
      this.setState({
        scratchNote: value
      });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }
                onChange={ onChangeNote }
                content={ this.state.scratchNote }/>
    );
  }

  render () {
    const point = this.state.point;
    const primaryNotes = point.notes
          .map(this.buildNoteComponent);

    const onShowButtons = () => {
      this.setState((prevState, props) => ({
        showButtons: !prevState.showButtons
      }));
    };

    return (
      <article>
        <h1 onClick={ onShowButtons }>{ this.state.point.title }</h1>
        { this.state.showButtons   && this.buildButtons() }
        { this.state.showNoteCreateForm  && this.buildNoteCreateForm() }
        <PointTime point={ this.state.point }/>
        <PointPlace point={ this.state.point }/>

        <section className="point-notes">
          { primaryNotes }
        </section>
      </article>
    );
  }
}

const PointTime = props => {
  let timeToDisplay = '';
  if (props.point.date) {
    timeToDisplay = props.point.date.textual;
  }

  return (
    <p className="subtitle">
      Time: { timeToDisplay }
    </p>
  );
};

const PointPlace = props => {

  let locationToDisplay = '';
  if (props.point.location) {
    locationToDisplay = props.point.location.textual;
  }

  return (
    <p className="subtitle">
      Place: { locationToDisplay }
    </p>
  );
};

export default Point;
