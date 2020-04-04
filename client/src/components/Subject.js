import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import SectionMentionedByPeople from './SectionMentionedByPeople';
import SectionMentionedInArticles from './SectionMentionedInArticles';
import SectionMentionedInSubjects from './SectionMentionedInSubjects';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Subject(props) {
  const {id} = useParams();
  const subject_id = parseInt(id, 10);

  const [subject, setSubject] = useState({
    id: subject_id,
    notes: [],
    tags_in_notes: [],
    decks_in_notes: [],
    mentioned_by_people: [],
    mentioned_in_subjects: [],
    mentioned_in_articles: []
  });

  ensureCorrectDeck(subject_id, setSubject, "subjects");

  const creator = NoteCreator(subject, setSubject, { subject_id }, subject.name);
  const notes = NoteHolder(subject, setSubject);

  return (
    <article>
      { creator }
      <section className="subject-notes">
        { notes }
      </section>
      <SectionMentionedByPeople mentionedBy={ subject.mentioned_by_people }/>
      <SectionMentionedInSubjects mentionedIn={ subject.mentioned_in_subjects }/>
      <SectionMentionedInArticles mentionedIn={ subject.mentioned_in_articles }/>
    </article>
  );
}
