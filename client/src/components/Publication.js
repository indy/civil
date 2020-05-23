import React from 'react';

import PublicationForm from './PublicationForm';
import { useStateValue } from '../lib/StateProvider';
import { idParam } from '../lib/reactUtils';
import SectionLinkBack from './SectionLinkBack';
import NoteManager from './NoteManager';
import DeckControls from './DeckControls';
import { ensureCorrectDeck } from './EnsureCorrectDeck';

export default function Publication(props) {
  const resource = "publications";
  const [state] = useStateValue();

  const publicationId = idParam();
  const publication = state.cache.deck[publicationId] || { id: publicationId };
  const publicationForm = <PublicationForm publication={publication} editing />;

  let authorHeading = <p className="subtitle">{ publication.author }</p>;
  let sourceHeading = <p className="subtitle">Source: <a href={ publication.source }>{ publication.source }</a></p>;

  ensureCorrectDeck(resource, publication.id);

  const deckControls = DeckControls({
    holder: publication,
    title: publication.title,
    resource,
    updateForm: publicationForm
  });

  const notes = NoteManager(publication);

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
