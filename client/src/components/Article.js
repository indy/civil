import React from 'react';

import ArticleForm from './ArticleForm';
import NoteHolder from './NoteHolder';
import { useStateValue } from '../lib/state';
import { idParam } from '../lib/utils';

export default function Article(props) {
  const [state, dispatch] = useStateValue();
  const article_id = idParam();

  const article = state.article[article_id] || { id: article_id };
  function setArticle(newArticle) {
    dispatch({
      type: 'setArticle',
      id: article_id,
      article: newArticle
    });
  }

  const articleForm = <ArticleForm id={ article_id }
                                   title={ article.title }
                                   source={ article.source }
                                   author={ article.author }
                                   update={ setArticle }
                      />;

  return (
    <NoteHolder
      holder={ article }
      setHolder={setArticle}
      title={article.title}
      resource="articles"
      isLoaded={ id => state.article[id] }
      updateForm={articleForm}>
      <h2>{ article.author }</h2>
      <h3>Source: <a href={ article.source }>{ article.source }</a></h3>
    </NoteHolder>
  );
}
