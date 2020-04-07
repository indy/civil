import React from 'react';

import ArticleForm from './ArticleForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import {ensureCorrectDeck, idParam} from '../lib/appUtils';
import { useStateValue } from '../state';

export default function Article(props) {
  const [state, dispatch] = useStateValue();
  const article_id = idParam();
  const resource = "articles";

  function setArticle(newArticle) {
    dispatch({
      type: 'setArticle',
      id: article_id,
      article: newArticle
    });
  }

  function isLoaded(id) {
    return state.article[id];
  }

  ensureCorrectDeck(resource, article_id, isLoaded, setArticle);

  const article = state.article[article_id] || { id: article_id };
  const notes = NoteHolder(article, setArticle, state, dispatch);

  const articleForm = <ArticleForm id={ article_id }
                                   title={ article.title }
                                   source={ article.source }
                                   author={ article.author }
                                   update={ setArticle }
                      />;
  const formHandler = FormHandler({
    resource,
    id: article_id,
    noteContainer: article,
    setNoteContainer: setArticle,
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
