import React from 'react';

import IdeaForm from './IdeaForm';
import NoteHolder from './NoteHolder';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/state';

export default function Idea(props) {
  const [state] = useStateValue();
  const idea_id = idParam();
  const idea = state.idea[idea_id] || { id: idea_id };
  const ideaForm = <IdeaForm idea={ idea } setMsg="setIdea"/>;

  return (
    <NoteHolder
      holder={ idea }
      setMsg="setIdea"
      title={idea.title}
      resource="ideas"
      isLoaded={ id => state.idea[id] }
      updateForm={ideaForm}>
    </NoteHolder>
  );
}
