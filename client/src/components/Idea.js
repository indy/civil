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
  const [state] = useStateValue();
  const ideaId = idParam();
  const idea = state.idea[ideaId] || { id: ideaId };
  const ideaForm = <IdeaForm idea={ idea } setMsg="setIdea"/>;

  const resource = "ideas";
  const setMsg = "setIdea";

  ensureCorrectDeck(resource, idea.id, id => state.idea[id], setMsg);
  const deckControls = DeckControls({
    holder: idea,
    setMsg,
    title: idea.title,
    resource,
    updateForm: ideaForm
  });

  const notes = NoteManager(idea, setMsg);

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
