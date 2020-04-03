import { useParams } from 'react-router-dom';
import React, { useState } from 'react';
import NoteCreateForm from './NoteCreateForm';
import QuoteCreateForm from './QuoteCreateForm';
import Note from './Note';
import Quote from './Quote';
import SectionMentionedByPeople from './SectionMentionedByPeople';
import SectionMentionedInSubjects from './SectionMentionedInSubjects';
import SectionMentionedInArticles from './SectionMentionedInArticles';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

import AutocompleteCandidates from '../lib/AutocompleteCandidates';

export default function Subject(props) {
  const {id} = useParams();
  const subject_id = parseInt(id, 10);

  const [subject, setSubject] = useState({
    id: subject_id,
    notes: [],
    quotes: [],
    tags_in_notes: [],
    decks_in_notes: [],
    mentioned_by_people: [],
    mentioned_in_subjects: [],
    mentioned_in_articles: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [showQuoteCreateForm, setShowQuoteCreateForm] = useState(false);
  const [currentSubjectId, setCurrentSubjectId] = useState(false);

  const [ac, addNewTagsToAutocomplete] = AutocompleteCandidates();

  if (subject_id !== currentSubjectId) {
    // get here on first load and when we're already on a /subjects/:id page and follow a Link to another /subjects/:id
    //
    fetchSubject();
  }

  function fetchSubject() {
    setCurrentSubjectId(subject_id);
    Net.get(`/api/subjects/${subject_id}`).then(s => {
      if (s) {
        setSubject(NoteUtils.applyTagsAndDecksToNotes(s));
      } else {
        console.error('fetchSubject');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = subject.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setSubject({...subject, notes});
  };

  const onEditedNote = (id, data) => {
    findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  };

  const onDeleteNote = (noteId) => {
    findNoteWithId(noteId, (notes, index) => {
      notes.splice(index, 1);
    });
  };

  const findQuoteWithId = (id, modifyFn) => {
    const quotes = subject.quotes;
    const index = quotes.findIndex(q => q.id === id);

    modifyFn(quotes, index);

    setSubject({...subject, quotes});
  };

  const onEditedQuote = (id, data) => {
    findQuoteWithId(id, (quotes, index) => {
      quotes[index] = Object.assign(quotes[index], data);
    });
  };

  const onDeleteQuote = (noteId) => {
    findQuoteWithId(noteId, (quotes, index) => {
      quotes.splice(index, 1);
    });
  };

  function onTagsChanged(note, newTagsCreated) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });

    // add any newly created tags to the autocomplete list
    if(newTagsCreated) {
      addNewTagsToAutocomplete(note.tags);
    }
  }

  function onDecksChanged(note) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });
  }

  const buildNoteComponent = (note) => {
    return (
      <Note key={ note.id }
            note={ note }
            ac = { ac }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onTagsChanged={ onTagsChanged }
            onDecksChanged={ onDecksChanged }
          />
    );
  };

  const buildQuoteComponent = (quote) => {
    return (
      <Quote key={ quote.id }
             quote={ quote }
             onDelete={ onDeleteQuote }
             onEdited={ onEditedQuote }/>);
  };

  const buildButtons = () => {
    let onAddNoteClicked = (event) => {
      setShowNoteCreateForm(!showNoteCreateForm);
      setShowQuoteCreateForm(false);
      event.preventDefault();
    };

    let onAddQuoteClicked = (event) => {
      setShowQuoteCreateForm(!showQuoteCreateForm);
      setShowNoteCreateForm(false);
      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note</button>
        <button onClick={ onAddQuoteClicked }>Add Quote</button>
      </div>
    );
  };

  const buildNoteCreateForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      NoteUtils.addNote(noteForm, { subject_id })
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(subject, setSubject, newNotes);
          setShowNoteCreateForm(false);
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }/>
    );
  };

  const buildQuoteCreateForm = () => {
    const onAddQuote = (e) => {
      const quoteForm = e.target;
      NoteUtils.addQuote(quoteForm, { subject_id })
        .then(newNotes => {
          NoteUtils.appendWithNewNotes(subject, setSubject, newNotes);
          setShowQuoteCreateForm(false);
        });
    };

    return (
      <QuoteCreateForm onSubmit={ onAddQuote }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteCreateForm(false);
    setShowQuoteCreateForm(false);
  };

  const notes = subject.notes.map(buildNoteComponent);
  const quotes = subject.quotes.map(buildQuoteComponent);

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ subject.name }</h1>
      { showButtons && buildButtons() }
      { showNoteCreateForm && buildNoteCreateForm() }
      { showQuoteCreateForm && buildQuoteCreateForm() }
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
