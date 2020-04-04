import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import DateUtils from '../lib/DateUtils';
import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import SectionMentionedByPeople from './SectionMentionedByPeople';
import SectionMentionedInArticles from './SectionMentionedInArticles';
import SectionMentionedInSubjects from './SectionMentionedInSubjects';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Person(props) {
  const {id} = useParams();
  const person_id = parseInt(id, 10);

  const [person, setPerson] = useState({
    id: person_id,
    notes: [],

    tags_in_notes: [],
    decks_in_notes: [],

    mentioned_by_people: [],
    mentioned_in_subjects: [],
    mentioned_in_articles: []
  });

  const isPersonDead = () => {
    return person.death_date !== null;
  };

  const buildDeath = () => {
    return (
      <Death person={ person }/>
    );
  };

  ensureCorrectDeck(person_id, setPerson, "people");

  const creator = NoteCreator(person, setPerson, { deck_id: person_id }, person.name);
  const notes = NoteHolder(person, setPerson);

  return (
    <article>
      { creator }
      <Birth person={ person }/>
      { isPersonDead() && buildDeath() }
      <Age person={ person }/>

      <section className="person-notes">
        { notes }
      </section>
      <SectionMentionedByPeople mentionedBy={ person.mentioned_by_people }/>
      <SectionMentionedInSubjects mentionedIn={ person.mentioned_in_subjects }/>
      <SectionMentionedInArticles mentionedIn={ person.mentioned_in_articles }/>
    </article>
  );
}

function Birth(props) {
  const person = props.person;

  const birth_date = person.birth_date ? person.birth_date.textual : '';
  const birth_location = person.birth_location ? person.birth_location.textual : '';

  return (
    <p className="subtitle">
      Born: { birth_date } { birth_location }
    </p>
  );
};

function Death(props) {
  const person = props.person;

  const death_date = person.death_date ? person.death_date.textual : '';
  const death_location = person.death_location ? person.death_location.textual : '';

  return (
    <p className="subtitle">
      Died: { death_date } { death_location }
    </p>
  );
};

function Age(props) {
  const person = props.person;
  const age = person.age || DateUtils.calculateAge(person.birth_date, person.death_date);

  return (
    <p className="subtitle">
      Age: { age }
    </p>
  );
};
