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
  let {id} = useParams();
  const subject_id = parseInt(id, 10);

  const [subject, setSubject] = useState({
    id: subject_id,
    notes: [],
    quotes: [],
    people_referenced: [],
    subjects_referenced: [],
    mentioned_by_people: [],
    mentioned_in_subjects: [],
    mentioned_in_articles: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [showQuoteCreateForm, setShowQuoteCreateForm] = useState(false);
  const [referencedSubjectsHash, setReferencedSubjectsHash] = useState({});
  const [referencedPeopleHash, setReferencedPeopleHash] = useState({});

  const [currentSubjectId, setCurrentSubjectId] = useState(false);

  const ac = AutocompleteCandidates();

  if (subject_id !== currentSubjectId) {
    // get here on first load and when we're already on a /subjects/:id page and follow a Link to another /subjects/:id
    //
    fetchSubject();
  }

  function fetchSubject() {
    setCurrentSubjectId(subject_id);
    Net.get(`/api/subjects/${subject.id}`).then(s => {
      if (s) {
        const referencedSubjectsHashNew = s.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHashNew = s.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        setSubject(s);
        setReferencedPeopleHash(referencedPeopleHashNew);
        setReferencedSubjectsHash(referencedSubjectsHashNew);
        window.scrollTo(0, 0);
      } else {
        console.error('fetchSubject');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = subject.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    subject.notes = notes; //??
    setSubject(subject);
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

    subject.quotes = quotes; //??
    setSubject(subject);
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

  const onAddReference = () => fetchSubject();

  const buildNoteComponent = (note) => {
    return (
      <Note key={ note.id }
            note={ note }
            people={ ac.people }
            subjects={ ac.subjects }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onAddReference={ onAddReference }
            referencedPeople={ referencedPeopleHash[note.id] }
            referencedSubjects={ referencedSubjectsHash[note.id] }
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
        .then(() => {
          fetchSubject();
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
        .then(() => {
          fetchSubject();
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
