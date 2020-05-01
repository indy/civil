import React from 'react';

import PublicationForm from './PublicationForm';
import { useStateValue } from '../lib/state';
import { idParam } from '../lib/reactUtils';
import SectionLinkBack from './SectionLinkBack';
import NoteManager from './NoteManager';
import DeckControls from './DeckControls';
import { ensureCorrectDeck } from './EnsureCorrectDeck';


export default function Publication(props) {
  const [state] = useStateValue();
  const publicationId = idParam();
  const publication = state.publication[publicationId] || { id: publicationId };
  const publicationForm = <PublicationForm publication={publication} setMsg="setPublication" />;

  let authorHeading = <p className="subtitle">{ publication.author }</p>;
  let sourceHeading = <p className="subtitle">Source: <a href={ publication.source }>{ publication.source }</a></p>;

  const resource = "publications";
  const setMsg = "setPublication";

  ensureCorrectDeck(resource, publication.id, id => state.publication[id], setMsg);

  const deckControls = DeckControls({
    holder: publication,
    setMsg,
    title: publication.title,
    resource,
    updateForm: publicationForm
  });

  const notes = NoteManager(publication, setMsg);

  return (
    <article>
      { deckControls.title }
      { deckControls.buttons }
      { deckControls.noteForm }
      { deckControls.updateForm }

      { publication.author && authorHeading }
      { publication.source && sourceHeading }

      { notes }
      <SectionLinkBack linkbacks={ publication.linkbacks_to_decks }/>
    </article>
  );
}
