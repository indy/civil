import React from 'react';

import PublicationForm from './PublicationForm';
import { useStateValue } from '../lib/StateProvider';
import { idParam } from '../lib/reactUtils';
import SectionLinkBack from './SectionLinkBack';
import DeckManager from './DeckManager';

export default function Publication(props) {
  const [state] = useStateValue();

  const publicationId = idParam();
  const publication = state.cache.deck[publicationId] || { id: publicationId };

  const deckManager = DeckManager({
    deck: publication,
    title: publication.title,
    resource: "publications",
    updateForm: <PublicationForm publication={publication} editing />
  });

  let authorHeading = <p className="subtitle">{ publication.author }</p>;
  let sourceHeading = <p className="subtitle">Source: <a href={ publication.source }>{ publication.source }</a></p>;

  return (
    <article>
      { deckManager.title }
      { deckManager.buttons }
      { deckManager.noteForm }
      { deckManager.updateForm }

      { publication.author && authorHeading }
      { publication.source && sourceHeading }

      { deckManager.notes }
      <SectionLinkBack linkbacks={ publication.linkbacks_to_decks }/>
    </article>
  );
}
