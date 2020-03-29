import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';

export default function Tags() {
  const [tags, setTags] = useState([]);
  let [showAddTagLink, setShowAddTagLink] = useState(false);

  useEffect(() => {
      async function fetcher() {
        const p = await Net.get('/api/tags');
        setTags(p);
      }
      fetcher();
  }, []);

  const toggleShowAdd = () => {
    setShowAddTagLink(!showAddTagLink);
  };

  const tagsList = tags.map(
    tag => <ListingLink id={ tag.id } key={ tag.id } name={ tag.name } resource='tags'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Tags</h1>
      { showAddTagLink && <Link to='/add-tag'>Add Tag</Link> }
      <ul>
        { tagsList }
      </ul>
    </div>
  );
}
