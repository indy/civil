import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';
import ArticleForm from './ArticleForm';

export default function Articles() {
  const [state, dispatch] = useStateValue();
  let [showAddArticleForm, setShowAddArticleForm] = useState(false);
  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const articles = await Net.get('/api/articles');

      dispatch({
        type: 'setArticles',
        articles
      });
    }
    if(!state.articlesLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddArticleForm(!showAddArticleForm);
  };

  const articlesList = state.articles.map(
    article => <ListingLink id={ article.id } key={ article.id } name={ article.title } resource='articles'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddArticleForm ? "Add Article" : "Articles" }</h1>
      { showAddArticleForm && <ArticleForm/> }
      <ul>
        { articlesList }
      </ul>
    </div>
  );
}
