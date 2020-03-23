import { useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import NoteCreateForm from './NoteCreateForm';
import QuoteCreateForm from './QuoteCreateForm';
import Note from './Note';
import Quote from './Quote';
import SectionMentionedByPeople from './SectionMentionedByPeople';
import SectionMentionedInSubjects from './SectionMentionedInSubjects';
import SectionMentionedInArticles from './SectionMentionedInArticles';

import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

export default function Person(props) {

  let {id} = useParams();

  const [person, setPerson] = useState({
        id: parseInt(id, 10),
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
  const [ac, setAc] = useState({
    people: [],
    subjects: []
  });
  const [referencedSubjectsHash, setReferencedSubjectsHash] = useState({});
  const [referencedPeopleHash, setReferencedPeopleHash] = useState({});

  useEffect(() => {
    fetchPerson();
    fetchAutocompleteLists();
  }, []);

  const fetchPerson = () => {
    Net.get(`/api/people/${person.id}`).then(p => {
      if (p) {
        const referencedSubjectsHashNew = p.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHashNew = p.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        setPerson(p);
        setReferencedPeopleHash(referencedPeopleHashNew);
        setReferencedSubjectsHash(referencedSubjectsHashNew);
      } else {
        console.error('foooked Person constructor');
      }
    });
  };


  const fetchAutocompleteLists = () => {
    Net.get("/api/autocomplete/people").then(peopleNew => {
      if (peopleNew) {
        setAc({
          people: peopleNew,
          subjects: ac.subjects
        });
      }
    });

    Net.get("/api/autocomplete/subjects").then(subjectsNew => {
      if (subjectsNew) {
        setAc({
          people: ac.people,
          subjects: subjectsNew
        });
      }
    });
  };


  const findNoteWithId = (id, modifyFn) => {
    const notes = person.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    person.notes = notes; //??
    setPerson(person);
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

    person.quotes = quotes; //??
    setPerson(person);
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
      NoteUtils.addNote(noteForm, { person_id: person.id })
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
      NoteUtils.addQuote(quoteForm, { person_id: person.id })
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
  const age = person.age !== "" ? person.age : Math.floor(person.age_calculated);

  return (
    <p className="subtitle">
      Age: { age }
    </p>
  );
};
