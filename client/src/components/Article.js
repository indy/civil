import React, { Component } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

class Article extends Component {
  constructor (props) {
    super(props);

    this.state = {
      article: {
        id: parseInt(props.match.params.articleId, 10),
        notes: [],
        people_referenced: [],
        subjects_referenced: []
      },
      showButtons: false,
      showNoteCreateForm: false,
      ac: {
        people: [],
        subjects: []
      },
      referencedSubjectsHash: {},
      referencedPeopleHash: {}
    };

    this.fetchArticle();
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

  fetchArticle = () => {
    const id = this.state.article.id;

    Net.get(`/api/articles/${id}`).then(article => {
      if (article) {
        const referencedSubjectsHash = article.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHash = article.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        this.setState({ article, referencedPeopleHash, referencedSubjectsHash });
      } else {
        console.error('foooked Article constructor');
      }
    });
  }

  findNoteWithId = (id, modifyFn) => {
    this.setState((prevState, props) => {
      // client-side update the state with the new note content
      //
      const article = prevState.article;
      const notes = article.notes;
      const index = notes.findIndex(n => n.id === id);

      if (index === -1) {
        // assert - should never get here
        console.log(`unable to find index of edited note: ${id}`);
        return {};
      }

      modifyFn(notes, index);

      return {
        article: article
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
    this.fetchArticle();
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
      NoteUtils.addNote(noteForm, { article_id: this.state.article.id })
        .then(() => {
          this.fetchArticle();
          this.setState({
            showNoteCreateForm: false
          });
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }/>
    );
  }

  render () {
    const article = this.state.article;
    const primaryNotes = article.notes
          .map(this.buildNoteComponent);

    const onShowButtons = () => {
      this.setState((prevState, props) => ({
        showButtons: !prevState.showButtons
      }));
    };

    return (
      <article>
        <h1 onClick={ onShowButtons }>{ this.state.article.title }</h1>
        { this.state.showButtons   && this.buildButtons() }
        { this.state.showNoteCreateForm  && this.buildNoteCreateForm() }
        <h2>Source: <a href={ this.state.article.source }>{ this.state.article.source }</a></h2>
        <section className="article-notes">
          { primaryNotes }
        </section>
      </article>
    );
  }
}

export default Article;
