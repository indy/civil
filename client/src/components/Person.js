import React, { Component } from 'react';
import NoteCreateForm from './NoteCreateForm';
import QuoteCreateForm from './QuoteCreateForm';
import Note from './Note';
import Quote from './Quote';
import SectionMentionedByPeople from './SectionMentionedByPeople';
import SectionMentionedInSubjects from './SectionMentionedInSubjects';
import SectionMentionedInArticles from './SectionMentionedInArticles';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

class Person extends Component {
  constructor (props) {
    super(props);

    this.state = {
      person: {
        id: parseInt(props.match.params.personId, 10),
        notes: [],
        quotes: [],
        people_referenced: [],
        subjects_referenced: [],
        mentioned_by_people: [],
        mentioned_in_subjects: [],
        mentioned_in_articles: []
      },
      showButtons: false,
      showNoteCreateForm: false,
      showQuoteCreateForm: false,
      ac: {
        people: [],
        subjects: []
      },
      referencedSubjectsHash: {},
      referencedPeopleHash: {}
    };

    this.fetchPerson();
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

  fetchPerson = () => {
    const id = this.state.person.id;

    Net.get(`/api/person/${id}`).then(person => {
      if (person) {

        const referencedSubjectsHash = person.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHash = person.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        this.setState({ person, referencedPeopleHash, referencedSubjectsHash });
      } else {
        console.error('foooked Person constructor');
      }
    });
  }

  findNoteWithId = (id, modifyFn) => {
    this.setState((prevState, props) => {
      // client-side update the state with the new note content
      //
      const person = prevState.person;
      const notes = person.notes;
      const index = notes.findIndex(n => n.id === id);

      if (index === -1) {
        // assert - should never get here
        console.log(`unable to find index of edited note: ${id}`);
        return {};
      }

      modifyFn(notes, index);

      return {
        person: person
      };
    });
  }

  findQuoteWithId = (id, modifyFn) => {
    this.setState((prevState, props) => {
      // client-side update the state with the new quote content
      //
      const person = prevState.person;
      const quotes = person.quotes;
      const index = quotes.findIndex(n => n.id === id);

      if (index === -1) {
        // assert - should never get here
        console.log(`unable to find index of edited quote: ${id}`);
        return {};
      }

      modifyFn(quotes, index);

      return {
        person: person
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
    this.fetchPerson();
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

  onEditedQuote = (id, data) => {
    this.findQuoteWithId(id, (quotes, index) => {
      quotes[index] = Object.assign(quotes[index], data);
    });
  }

  onDeleteQuote = (noteId) => {
    this.findQuoteWithId(noteId, (quotes, index) => {
      quotes.splice(index, 1);
    });
  }

  buildQuoteComponent = (quote) => {
    return (
      <Quote key={ quote.id }
             quote={ quote }
             onDelete={ this.onDeleteQuote }
             onEdited={ this.onEditedQuote }/>);
  }

  buildButtons = () => {
    let onAddNoteClicked = (event) => {
      this.setState((prevState, props) => ({
        showNoteCreateForm: !prevState.showNoteCreateForm,
        showQuoteCreateForm: false
      }));
      event.preventDefault();
    };

    let onAddQuoteClicked = (event) => {
      this.setState((prevState, props) => ({
        showQuoteCreateForm: !prevState.showQuoteCreateForm,
        showNoteCreateForm: false
      }));
      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note</button>
        <button onClick={ onAddQuoteClicked }>Add Quote</button>
      </div>
    );
  }

  buildNoteCreateForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      NoteUtils.addNote(noteForm, { person_id: this.state.person.id })
        .then(() => {
          this.fetchPerson();
          this.setState({
            showNoteCreateForm: false
          });
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote } />
    );
  }

  buildQuoteCreateForm = () => {
    const onAddQuote = (e) => {
      const quoteForm = e.target;
      NoteUtils.addQuote(quoteForm, { person_id: this.state.person.id })
        .then(() => {
          this.fetchPerson();
          this.setState({
            showQuoteCreateForm: false
          });
        });
    };

    return (
      <QuoteCreateForm onSubmit={ onAddQuote }/>
    );
  }

  isPersonDead = () => {
    const person = this.state.person;
    return person.death_date !== null;
  }

  buildDeath = () => {
    return (
      <Death person={ this.state.person }/>
    );
  }

  render () {
    const person = this.state.person;
    const notes = person.notes.map(this.buildNoteComponent);
    const quotes = person.quotes.map(this.buildQuoteComponent);

    const onShowButtons = () => {
      this.setState((prevState, props) => ({
        showButtons: !prevState.showButtons,
        showNoteCreateForm: false,
        showQuoteCreateForm: false
      }));
    };

    return (
      <article>
        <h1 onClick={ onShowButtons }>{ this.state.person.name }</h1>
        { this.state.showButtons && this.buildButtons() }
        { this.state.showNoteCreateForm && this.buildNoteCreateForm() }
        { this.state.showQuoteCreateForm && this.buildQuoteCreateForm() }
        <Birth person={ this.state.person }/>
        { this.isPersonDead() && this.buildDeath() }
        <Age person={ this.state.person }/>
        <section className="person-notes">
          { notes }
        </section>
        <section className="person-quotes">
          <div className="epigraph">
            { quotes }
          </div>
        </section>
        <SectionMentionedByPeople mentionedBy={ person.mentioned_by_people }/>
        <SectionMentionedInSubjects mentionedIn={ person.mentioned_in_subjects }/>
        <SectionMentionedInArticles mentionedIn={ person.mentioned_in_articles }/>
      </article>
    );
  }
}

const Birth = props => {
  const person = props.person;

  const birth_date = person.birth_date ? person.birth_date.textual : '';
  const birth_place = person.birth_place ? person.birth_place.textual : '';

  return (
    <p className="subtitle">
      Born: { birth_date } { birth_place }
    </p>
  );
};

const Death = props => {
  const person = props.person;

  const death_date = person.death_date ? person.death_date.textual : '';
  const death_place = person.death_place ? person.death_place.textual : '';

  return (
    <p className="subtitle">
      Died: { death_date } { death_place }
    </p>
  );
};

const Age = props => {
  const person = props.person;
  const age = person.age !== "" ? person.age : Math.floor(person.age_calculated);

  return (
    <p className="subtitle">
      Age: { age }
    </p>
  );
};

export default Person;
