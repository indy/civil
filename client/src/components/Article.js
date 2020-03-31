import { useParams } from 'react-router-dom';
import React, { useState } from 'react';
import NoteCreateForm from './NoteCreateForm';
import Note from './Note';
import NoteUtils from '../lib/NoteUtils';
import Net from '../lib/Net';

import AutocompleteCandidates from '../lib/AutocompleteCandidates';

export default function Article(props) {
  const {id} = useParams();
  const article_id = parseInt(id, 10);

  const [article, setArticle] = useState({
    id: article_id,
    notes: [],
    tags_in_notes: [],
    people_in_notes: [],
    subjects_in_notes: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);

  const [tagsInNotes, setTagsInNotes] = useState({});
  const [subjectsInNotes, setSubjectsInNotes] = useState({});
  const [peopleInNotes, setPeopleInNotes] = useState({});

  const [currentArticleId, setCurrentArticleId] = useState(false);

  const ac = AutocompleteCandidates();

  if (article_id !== currentArticleId) {
    // get here on first load and when we're already on a /articles/:id page and follow a Link to another /articles/:id
    //
    fetchArticle();
  }

  function fetchArticle() {
    setCurrentArticleId(article_id);
    Net.get(`/api/articles/${article.id}`).then(art => {
      if (art) {
        const tagsInNotes = NoteUtils.hashByNoteIds(art.tags_in_notes);
        const peopleInNotes = NoteUtils.hashByNoteIds(art.people_in_notes);
        const subjectsInNotes = NoteUtils.hashByNoteIds(art.subjects_in_notes);

        setArticle(art);
        setTagsInNotes(tagsInNotes);
        setPeopleInNotes(peopleInNotes);
        setSubjectsInNotes(subjectsInNotes);
        window.scrollTo(0, 0);
      } else {
        console.error('fetchArticle');
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
            ac = { ac }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onAddReference={ onAddReference }
            tagsInNote={ tagsInNotes[note.id] }
            peopleInNote={ peopleInNotes[note.id] }
            subjectsInNote={ subjectsInNotes[note.id] }
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
      NoteUtils.addNote(noteForm, { article_id })
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
