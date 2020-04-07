import { useParams } from 'react-router-dom';
import React from 'react';

import IdeaForm from './IdeaForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';
import { useStateValue } from '../state';

export default function Idea(props) {
  const [state, dispatch] = useStateValue();

  const {id} = useParams();
  const idea_id = parseInt(id, 10);

  const resource = "ideas";

  function setIdea(newIdea) {
    dispatch({
      type: 'setIdea',
      id: idea_id,
      idea: newIdea
    });
  }

  function isLoaded(id) {
    return state.idea[id];
  }

  ensureCorrectDeck(resource, idea_id, isLoaded, setIdea);

  const idea = state.idea[idea_id] || { id: idea_id };
  const notes = NoteHolder(idea, setIdea);

  const ideaForm = <IdeaForm id={ idea_id }
                             title={ idea.title }
                             update={ setIdea }
                   />;

  const formHandler = FormHandler({
    resource,
    id: idea_id,
    noteContainer: idea,
    setNoteContainer: setIdea,
    title: idea.title,
    form: ideaForm
  });

  return (
    <article>
      { formHandler }
      <section>
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ idea }/>
    </article>
  );
}
