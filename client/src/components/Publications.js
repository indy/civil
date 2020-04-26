import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';
import PublicationForm from './PublicationForm';

export default function Publications() {
  const [state, dispatch] = useStateValue();
  let [showAddPublicationForm, setShowAddPublicationForm] = useState(false);
  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const publications = await Net.get('/api/publications');

      dispatch({
        type: 'setPublications',
        publications
      });
    }
    if(!state.publicationsLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddPublicationForm(!showAddPublicationForm);
  };

  const publicationsList = state.publications.map(
    publication => <ListingLink id={ publication.id } key={ publication.id } name={ publication.title } resource='publications'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddPublicationForm ? "Add Publication" : "Publications" }</h1>
      { showAddPublicationForm && <PublicationForm/> }
      <ul>
        { publicationsList }
      </ul>
    </div>
  );
}