import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';

export default function Ideas() {
  const [ideas, setIdeas] = useState([]);
  let [showAddIdeaLink, setShowAddIdeaLink] = useState(false);

  useEffect(() => {
      async function fetcher() {
        const p = await Net.get('/api/ideas');
        setIdeas(p);
      }
      fetcher();
  }, []);

  const toggleShowAdd = () => {
    setShowAddIdeaLink(!showAddIdeaLink);
  };

  const ideasList = ideas.map(
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
