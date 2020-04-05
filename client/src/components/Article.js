import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Article(props) {
  const {id} = useParams();
  const article_id = parseInt(id, 10);

  const [article, setArticle] = useState({ id: article_id });

  ensureCorrectDeck(article_id, setArticle, "articles");

  const creator = NoteCreator(article, setArticle, { deck_id: article_id }, article.title);
  const notes = NoteHolder(article, setArticle);

  return (
    <article>
      { creator }
      <h2>{ article.author }</h2>
      <h3>Source: <a href={ article.source }>{ article.source }</a></h3>
      <section className="article-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ article }/>
    </article>
  );
}
