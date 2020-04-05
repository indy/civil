import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Idea(props) {
  const {id} = useParams();
  const idea_id = parseInt(id, 10);

  const [idea, setIdea] = useState({ id: idea_id });

  ensureCorrectDeck(idea_id, setIdea, "ideas");

  const creator = NoteCreator(idea, setIdea, { idea_id }, idea.title);
  const notes = NoteHolder(idea, setIdea);

  return (
    <article>
      { creator }
      <section className="idea-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ idea }/>
    </article>
  );
}
