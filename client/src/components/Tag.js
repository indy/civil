import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Tag(props) {
  const {id} = useParams();
  const tag_id = parseInt(id, 10);

  const [tag, setTag] = useState({
    id: tag_id,
    notes: [],
    tags_in_notes: [],
    decks_in_notes: []
  });

  ensureCorrectDeck(tag_id, setTag, "tags");

  const creator = NoteCreator(tag, setTag, { tag_id }, tag.name);
  const notes = NoteHolder(tag, setTag);

  return (
    <article>
      { creator }
      <section className="tag-notes">
        { notes }
      </section>
    </article>
  );
}