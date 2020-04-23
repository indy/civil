import React from 'react';

import PublicationForm from './PublicationForm';
import NoteHolder from './NoteHolder';
import { useStateValue } from '../lib/state';
import { idParam } from '../lib/reactUtils';

export default function Publication(props) {
  const [state] = useStateValue();
  const publication_id = idParam();
  const publication = state.publication[publication_id] || { id: publication_id };
  const publicationForm = <PublicationForm publication={publication} setMsg="setPublication" />;

  return (
    <NoteHolder
      holder={ publication }
      setMsg="setPublication"
      title={ publication.title }
      resource="publications"
      isLoaded={ id => state.publication[id] }
      updateForm={ publicationForm }>
      <h2>{ publication.author }</h2>
      <h3>Source: <a href={ publication.source }>{ publication.source }</a></h3>
    </NoteHolder>
  );
}
