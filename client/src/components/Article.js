import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Article(props) {
  const {id} = useParams();
  const article_id = parseInt(id, 10);

  const [article, setArticle] = useState({
    id: article_id,
    notes: []
  });

  ensureCorrectDeck(article_id, setArticle, "articles");

  const creator = NoteCreator(article, setArticle, { article_id }, article.title);
  const notes = NoteHolder(article, setArticle);

  return (
    <article>
      { creator }
      <h2>Source: <a href={ article.source }>{ article.source }</a></h2>
      <section className="article-notes">
        { notes }
      </section>
    </article>
  );
}
