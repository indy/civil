import React from 'react';

import IdeaForm from './IdeaForm';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';
import SectionLinkBack from './SectionLinkBack';
import SectionSearchResultsLinkBack from './SectionSearchResultsLinkBack';
import DeckManager from './DeckManager';

export default function Idea(props) {
  const [state] = useStateValue();

  const id = idParam();
  const idea = state.cache.deck[id] || { id: id };

  const deckManager = DeckManager({
    deck: idea,
    title: idea.title,
    resource: "ideas",
    updateForm: <IdeaForm idea={ idea } editing />
  });

  console.log(`${Math.random()}`);

  return (
    <article>
      { deckManager.title }
      { deckManager.buttons }
      { deckManager.noteForm }
      { deckManager.updateForm }
      { deckManager.notes }
      <SectionLinkBack linkbacks={ idea.linkbacks_to_decks }/>
      <SectionSearchResultsLinkBack linkbacks={ idea.search_results }/>
    </article>
  );
}
