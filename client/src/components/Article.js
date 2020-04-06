import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import ArticleForm from './ArticleForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Article(props) {
  const {id} = useParams();
  const article_id = parseInt(id, 10);

  const [article, setArticle] = useState({ id: article_id });

  ensureCorrectDeck(article_id, setArticle, "articles");

  const notes = NoteHolder(article, setArticle);
  const articleForm = <ArticleForm id={ article_id }
                                   title={ article.title }
                                   source={ article.source }
                                   author={ article.author }
                                   update={ setArticle }
                      />;
  const formHandler = FormHandler({
    noteContainer: article,
    setNoteContainer: setArticle,
    ident: { deck_id: article_id },
    title: article.title,
    form: articleForm
  });

  return (
    <article>
      { formHandler }
      <h2>{ article.author }</h2>
      <h3>Source: <a href={ article.source }>{ article.source }</a></h3>
      <section className="article-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ article }/>
    </article>
  );
}
