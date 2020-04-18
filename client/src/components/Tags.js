import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';
import TagForm from './TagForm';

export default function Tags() {
  const [state, dispatch] = useStateValue();
  let [showAddTagForm, setShowAddTagForm] = useState(false);
  ensureAC(state, dispatch);

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
    setShowAddTagForm(!showAddTagForm);
  };

  const tagsList = state.tags.map(
    tag => <ListingLink id={ tag.id } key={ tag.id } name={ tag.name } resource='tags'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddTagForm ? "Add Tag" : "Tags" }</h1>
      { showAddTagForm && <TagForm/> }
      <ul>
        { tagsList }
      </ul>
    </div>
  );
}
