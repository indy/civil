import { useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';
import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

export default function Article(props) {
  let {id} = useParams();
  const [article, setArticle] = useState({
    id: parseInt(id, 10),
    notes: [],
    people_referenced: [],
    subjects_referenced: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [ac, setAc] = useState({
    people: [],
    subjects: []
  });
  const [referencedSubjectsHash, setReferencedSubjectsHash] = useState({});
  const [referencedPeopleHash, setReferencedPeopleHash] = useState({});

  useEffect(() => {
    fetchArticle();
    fetchAutocompleteLists();
  }, []);

  const fetchArticle = () => {
    Net.get(`/api/articles/${article.id}`).then(art => {
      if (art) {
        const referencedSubjectsHashNew = art.subjects_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        const referencedPeopleHashNew = art.people_referenced.reduce(function(a, b) {
          const note_id = b.note_id;
          if (a[note_id]) {
            a[note_id].push(b);
          } else {
            a[note_id] = [b];
          }
          return a;
        }, {});

        setArticle(art);
        setReferencedPeopleHash(referencedPeopleHashNew);
        setReferencedSubjectsHash(referencedSubjectsHashNew);
      } else {
        console.error('foooked Article constructor');
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
    const notes = article.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    article.notes = notes; //??
    setArticle(article);
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

  const onAddReference = () => fetchArticle();

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

  const buildButtons = () => {
    let onAddNoteClicked = (event) => {
      setShowNoteCreateForm(!showNoteCreateForm);
      event.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note</button>
      </div>
    );
  };

  const buildNoteCreateForm = () => {
    const onAddNote = (e) => {
      const noteForm = e.target;
      NoteUtils.addNote(noteForm, { article_id: article.id })
        .then(() => {
          fetchArticle();
          setShowNoteCreateForm(false);
        });
    };

    return (
      <NoteCreateForm onSubmit={ onAddNote }/>
    );
  };

  const onShowButtons = () => {
    setShowButtons(!showButtons);
    setShowNoteCreateForm(false);
  };

  const notes = article.notes.map(buildNoteComponent);

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ article.title }</h1>
      { showButtons   && buildButtons() }
      { showNoteCreateForm  && buildNoteCreateForm() }
      <h2>Source: <a href={ article.source }>{ article.source }</a></h2>
      <section className="article-notes">
        { notes }
      </section>
    </article>
  );

}
