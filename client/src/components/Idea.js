import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import IdeaForm from './IdeaForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Idea(props) {
  const {id} = useParams();
  const idea_id = parseInt(id, 10);

  const [idea, setIdea] = useState({ id: idea_id });

  ensureCorrectDeck(idea_id, setIdea, "ideas");

  const notes = NoteHolder(idea, setIdea);
  const ideaForm = <IdeaForm id={ idea_id }
                             title={ idea.title }
                             update={ setIdea }
                   />;
  const formHandler = FormHandler({
    noteContainer: idea,
    setNoteContainer: setIdea,
    ident: { deck_id: idea_id },
    title: idea.title,
    form: ideaForm
  });

  return (
    <article>
      { formHandler }
      <section className="idea-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ idea }/>
    </article>
  );
}
