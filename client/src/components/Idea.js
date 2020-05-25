import React from 'react';

import IdeaForm from './IdeaForm';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';
import SectionLinkBack from './SectionLinkBack';
import SectionSearchResultsLinkBack from './SectionSearchResultsLinkBack';
import DeckManager from './DeckManager';

import Vis from './Vis';

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

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowVis = deckManager.hasNotes || idea.linkbacks_to_decks;

  return (
    <article>
      { deckManager.title }
      { deckManager.buttons }
      { deckManager.noteForm }
      { deckManager.updateForm }
      { deckManager.notes }
      <SectionLinkBack linkbacks={ idea.linkbacks_to_decks }/>
      <SectionSearchResultsLinkBack linkbacks={ idea.search_results }/>
      { okToShowVis && <Vis id = { id } onlyIdeas depth={ 4 } /> }
    </article>
  );
}
