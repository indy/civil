import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';

export default function Articles() {
  const [articles, setArticles] = useState([]);
  let [showAddArticleLink, setShowAddArticleLink] = useState(false);

  useEffect(() => {
      async function fetcher() {
        const p = await Net.get('/api/articles');
        setArticles(p);
      }
      fetcher();
  }, []);

  const toggleShowAdd = () => {
    setShowAddArticleLink(!showAddArticleLink);
  };

  const articlesList = articles.map(
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
