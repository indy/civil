import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import {ensureAC} from '../lib/utils';
import IdeaForm from './IdeaForm';

export default function Ideas() {
  const [state, dispatch] = useStateValue();
  let [showAddIdeaForm, setShowAddIdeaForm] = useState(false);
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
    setShowAddIdeaForm(!showAddIdeaForm);
  };

  const ideasList = state.ideas.map(
    idea => <ListingLink id={ idea.id } key={ idea.id } name={ idea.title } resource='ideas'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddIdeaForm ? "Add Idea" : "Ideas" }</h1>
      { showAddIdeaForm && <IdeaForm/> }
      <ul>
        { ideasList }
      </ul>
    </div>
  );
}
