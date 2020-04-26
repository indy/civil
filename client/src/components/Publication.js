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

  let authorHeading = <p className="subtitle">{ publication.author }</p>;
  let sourceHeading = <p className="subtitle">Source: <a href={ publication.source }>{ publication.source }</a></p>;

  return (
    <NoteHolder
      holder={ publication }
      setMsg="setPublication"
      title={ publication.title }
      resource="publications"
      isLoaded={ id => state.publication[id] }
      updateForm={ publicationForm }>
      { publication.author && authorHeading }
      { publication.source && sourceHeading }
    </NoteHolder>
  );
}
