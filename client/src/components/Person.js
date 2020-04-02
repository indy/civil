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
import DateUtils from '../lib/DateUtils';

import AutocompleteCandidates from '../lib/AutocompleteCandidates';

export default function Person(props) {
  const {id} = useParams();
  const person_id = parseInt(id, 10);

  const [person, setPerson] = useState({
    id: person_id,
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
  const [currentPersonId, setCurrentPersonId] = useState(false);

  const [ac, addNewTagsToAutocomplete] = AutocompleteCandidates();

  if (person_id !== currentPersonId) {
    // get here on first load and when we're already on a /people/:id page and follow a Link to another /people/:id
    //
    fetchPerson();
  }

  function fetchPerson() {
    setCurrentPersonId(person_id);
    Net.get(`/api/people/${person_id}`).then(p => {
      if (p) {
        setPerson(NoteUtils.applyTagsAndDecksToNotes(p));
      } else {
        console.error('fetchPerson');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = person.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setPerson({...person, notes});
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
    const quotes = person.quotes;
    const index = quotes.findIndex(q => q.id === id);

    modifyFn(quotes, index);

    setPerson({...person, quotes});
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

  const onAddReference = () => fetchPerson();

  function onTagsChanged(note, newTagsCreated) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });

    // add any newly created tags to the autocomplete list
    if(newTagsCreated) {
      addNewTagsToAutocomplete(note.tags);
    }
  }

  const buildNoteComponent = (note) => {
    return (
      <Note key={ note.id }
            note={ note }
            ac = { ac }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onAddReference={ onAddReference }
            onTagsChanged={ onTagsChanged }
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
      NoteUtils.addNote(noteForm, { person_id })
        .then(() => {
          fetchPerson();
          setShowNoteCreateForm(false);
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote } />
    );
  };

  const buildQuoteCreateForm = () => {
    const onAddQuote = (e) => {
      const quoteForm = e.target;
      NoteUtils.addQuote(quoteForm, { person_id })
        .then(() => {
          fetchPerson();
          setShowQuoteCreateForm(false);
        });
    };

    return (
      <QuoteCreateForm onSubmit={ onAddQuote }/>
    );
  };

  const isPersonDead = () => {
    return person.death_date !== null;
  };

  const buildDeath = () => {
    return (
      <Death person={ person }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteCreateForm(false);
    setShowQuoteCreateForm(false);
  };

  const notes = person.notes.map(buildNoteComponent);
  const quotes = person.quotes.map(buildQuoteComponent);

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ person.name }</h1>
      { showButtons && buildButtons() }
      { showNoteCreateForm && buildNoteCreateForm() }
      { showQuoteCreateForm && buildQuoteCreateForm() }
      <Birth person={ person }/>
      { isPersonDead() && buildDeath() }
      <Age person={ person }/>

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

function Birth(props) {
  const person = props.person;

  const birth_date = person.birth_date ? person.birth_date.textual : '';
  const birth_location = person.birth_location ? person.birth_location.textual : '';

  return (
    <p className="subtitle">
      Born: { birth_date } { birth_location }
    </p>
  );
};

function Death(props) {
  const person = props.person;

  const death_date = person.death_date ? person.death_date.textual : '';
  const death_location = person.death_location ? person.death_location.textual : '';

  return (
    <p className="subtitle">
      Died: { death_date } { death_location }
    </p>
  );
};

function Age(props) {
  const person = props.person;
  const age = person.age || DateUtils.calculateAge(person.birth_date, person.death_date);

  return (
    <p className="subtitle">
      Age: { age }
    </p>
  );
};
