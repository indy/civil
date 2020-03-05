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

class Subject extends Component {
  constructor (props) {
    super(props);

    this.state = {
      subject: {
        id: parseInt(props.match.params.subjectId, 10),
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

    this.fetchSubject();
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

  fetchSubject = () => {
    const id = this.state.subject.id;

    Net.get(`/api/subject/${id}`).then(subject => {
      if (subject) {

        const referencedSubjectsHash = subject.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHash = subject.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});


        this.setState({ subject, referencedPeopleHash, referencedSubjectsHash });
      } else {
        console.error('foooked Subject constructor');
      }
    });
  }

  findNoteWithId = (id, modifyFn) => {
    this.setState((prevState, props) => {
      // client-side update the state with the new note content
      //
      const subject = prevState.subject;
      const notes = subject.notes;
      const index = notes.findIndex(n => n.id === id);

      if (index === -1) {
        // assert - should never get here
        console.log(`unable to find index of edited note: ${id}`);
        return {};
      }

      modifyFn(notes, index);

      return {
        subject: subject
      };
    });
  }

  findQuoteWithId = (id, modifyFn) => {
    this.setState((prevState, props) => {
      // client-side update the state with the new quote content
      //
      const subject = prevState.subject;
      const quotes = subject.quotes;
      const index = quotes.findIndex(n => n.id === id);

      if (index === -1) {
        // assert - should never get here
        console.log(`unable to find index of edited quote: ${id}`);
        return {};
      }

      modifyFn(quotes, index);

      return {
        subject: subject
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
    this.fetchSubject();
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
        showNoteCreateForm: !prevState.showNoteCreateForm
      }));
      event.preventDefault();
    };

    let onAddQuoteClicked = (event) => {
      this.setState((prevState, props) => ({
        showQuoteCreateForm: !prevState.showQuoteCreateForm
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
      NoteUtils.addNote(noteForm, { subject_id: this.state.subject.id })
        .then(() => {
          this.fetchSubject();
          this.setState({
            showNoteCreateForm: false
          });
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }/>
    );
  }

  buildQuoteCreateForm = () => {
    const onAddQuote = (e) => {
      const quoteForm = e.target;
      NoteUtils.addQuote(quoteForm, { subject_id: this.state.subject.id })
        .then(() => {
          this.fetchSubject();
          this.setState({
            showQuoteCreateForm: false
          });
        });
    };

    return (
      <QuoteCreateForm onSubmit={ onAddQuote }/>
    );
  }

  render () {
    const subject = this.state.subject;
    const notes = subject.notes.map(this.buildNoteComponent);
    const quotes = subject.quotes.map(this.buildQuoteComponent);

    const onShowButtons = () => {
      this.setState((prevState, props) => ({
        showButtons: !prevState.showButtons
      }));
    };

    return (
      <article>
        <h1 onClick={ onShowButtons }>{ this.state.subject.name }</h1>
        { this.state.showButtons   && this.buildButtons() }
        { this.state.showNoteCreateForm  && this.buildNoteCreateForm() }
        { this.state.showQuoteCreateForm && this.buildQuoteCreateForm() }
        <section className="subject-notes">
          { notes }
        </section>
        <section className="subject-quotes">
          <div className="epigraph">
            { quotes }
          </div>
        </section>
        <SectionMentionedByPeople mentionedBy={ subject.mentioned_by_people }/>
        <SectionMentionedInSubjects mentionedIn={ subject.mentioned_in_subjects }/>
        <SectionMentionedInArticles mentionedIn={ subject.mentioned_in_articles }/>
      </article>
    );
  }
}

export default Subject;
