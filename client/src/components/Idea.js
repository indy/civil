import React from 'react';

import IdeaForm from './IdeaForm';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';
import SectionLinkBack from './SectionLinkBack';
import SectionSearchResultsLinkBack from './SectionSearchResultsLinkBack';
import NoteManager from './NoteManager';
import DeckControls from './DeckControls';
import { ensureCorrectDeck } from './EnsureCorrectDeck';

export default function Idea(props) {
  const resource = "ideas";
  const [state] = useStateValue();

  const id = idParam();
  const idea = state.cache.deck[id] || { id: id };
  const ideaForm = <IdeaForm idea={ idea } editing />;

  ensureCorrectDeck(resource, idea.id);   // 2 redraws here

  const deckControls = DeckControls({
    holder: idea,
    title: idea.title,
    resource,
    updateForm: ideaForm
  });

  const notes = NoteManager(idea);

  console.log(`${Math.random()}`);

  return (
    <article>
      { deckControls.title }
      { deckControls.buttons }
      { deckControls.noteForm }
      { deckControls.updateForm }
      { notes }
      <SectionLinkBack linkbacks={ idea.linkbacks_to_decks }/>
      <SectionSearchResultsLinkBack linkbacks={ idea.search_results }/>
    </article>
  );
}
