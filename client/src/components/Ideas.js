import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../state';
import {ensureAC} from '../lib/appUtils';

export default function Ideas() {
  const [state, dispatch] = useStateValue();
  let [showAddIdeaLink, setShowAddIdeaLink] = useState(false);
  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const ideas = await Net.get('/api/ideas');

      dispatch({
        type: 'setIdeas',
        ideas
      });
    }

    if(!state.ideasLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddIdeaLink(!showAddIdeaLink);
  };

  const ideasList = state.ideas.map(
    idea => <ListingLink id={ idea.id } key={ idea.id } name={ idea.title } resource='ideas'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Ideas</h1>
      { showAddIdeaLink && <Link to='/add-idea'>Add Idea</Link> }
      <ul>
        { ideasList }
      </ul>
    </div>
  );
}
