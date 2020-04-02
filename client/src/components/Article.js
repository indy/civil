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
    notes: []
  });
  const [showButtons, setShowButtons] = useState(false);
  const [showNoteCreateForm, setShowNoteCreateForm] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState(false);

  const [ac, addNewTagsToAutocomplete] = AutocompleteCandidates();

  if (article_id !== currentArticleId) {
    // get here on first load and when we're already on a /articles/:id page and follow a Link to another /articles/:id
    //
    fetchArticle();
  }

  function fetchArticle() {
    setCurrentArticleId(article_id);
    Net.get(`/api/articles/${article.id}`).then(art => {
      if (art) {
        setArticle(NoteUtils.applyTagsAndDecksToNotes(art));
      } else {
        console.error('fetchArticle');
      }
    });
  };

  const findNoteWithId = (id, modifyFn) => {
    const notes = article.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);

    setArticle({...article, notes});
  };

  // todo: check that these are actually updating the ui
  const onEditedNote = (id, data) => {
    findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  };

  // todo: check that these are actually updating the ui
  const onDeleteNote = (noteId) => {
    findNoteWithId(noteId, (notes, index) => {
      notes.splice(index, 1);
    });
  };

  const onAddReference = () => fetchArticle();

  // can't just modify article and then call setArticle(article)
  // React is unable to detect changes this way.
  // have to setArticle with a new object: setArticle({...article, title: 'a new title'});
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

  return (
    <article>
      <h1 onClick={ onShowButtons }>{ article.title }</h1>
      { showButtons && buildButtons() }
      { showNoteCreateForm && buildNoteCreateForm() }
      <h2>Source: <a href={ article.source }>{ article.source }</a></h2>
      <section className="article-notes">
        { article.notes.map(buildNoteComponent) }
      </section>
    </article>
  );

}
