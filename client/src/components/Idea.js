import React from 'react';

import IdeaForm from './IdeaForm';
import NoteHolder from './NoteHolder';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Idea(props) {
  const [state, dispatch] = useStateValue();
  const idea_id = idParam();

  const idea = state.idea[idea_id] || { id: idea_id };
  function setIdea(newIdea) {
    dispatch({
      type: 'setIdea',
      id: idea_id,
      idea: newIdea
    });
  }

  const ideaForm = <IdeaForm id={ idea_id }
                             title={ idea.title }
                             update={ setIdea }
                   />;

  return (
    <NoteHolder
      holder={ idea }
      setHolder={setIdea}
      title={idea.title}
      resource="ideas"
      isLoaded={ id => state.idea[id] }
      updateForm={ideaForm}>
    </NoteHolder>
  );
}
