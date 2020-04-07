import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../state';

export default function Tags() {
  const [state, dispatch] = useStateValue();
  let [showAddTagLink, setShowAddTagLink] = useState(false);

  useEffect(() => {
    async function fetcher() {
      const tags = await Net.get('/api/tags');

      dispatch({
        type: 'setTags',
        tags
      });
    }

    if(!state.tagsLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddTagLink(!showAddTagLink);
  };

  const tagsList = state.tags.map(
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
