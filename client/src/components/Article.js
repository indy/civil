import React from 'react';

import ArticleForm from './ArticleForm';
import NoteHolder from './NoteHolder';
import { useStateValue } from '../lib/state';
import { idParam } from '../lib/reactUtils';

export default function Article(props) {
  const [state] = useStateValue();
  const article_id = idParam();
  const article = state.article[article_id] || { id: article_id };
  const articleForm = <ArticleForm article={article} setMsg="setArticle" />;

  return (
    <NoteHolder
      holder={ article }
      setMsg="setArticle"
      title={ article.title }
      resource="articles"
      isLoaded={ id => state.article[id] }
      updateForm={ articleForm }>
      <h2>{ article.author }</h2>
      <h3>Source: <a href={ article.source }>{ article.source }</a></h3>
    </NoteHolder>
  );
}
