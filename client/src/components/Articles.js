import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import {ensureAC} from '../lib/utils';

export default function Articles() {
  const [state, dispatch] = useStateValue();
  let [showAddArticleLink, setShowAddArticleLink] = useState(false);
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
    setShowAddArticleLink(!showAddArticleLink);
  };

  const articlesList = state.articles.map(
    article => <ListingLink id={ article.id } key={ article.id } name={ article.title } resource='articles'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Articles</h1>
      { showAddArticleLink && <Link to='/add-article'>Add Article</Link> }
      <ul>
        { articlesList }
      </ul>
    </div>
  );
}
