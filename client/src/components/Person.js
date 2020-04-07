import React from 'react';

import PersonForm from './PersonForm';
import DateUtils from '../lib/DateUtils';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import {ensureCorrectDeck, idParam} from '../lib/appUtils';
import { useStateValue } from '../state';

export default function Person(props) {
  const [state, dispatch] = useStateValue();
  const person_id = idParam();
  const resource = "people";

  function setPerson(newPerson) {
    dispatch({
      type: 'setPerson',
      id: person_id,
      person: newPerson
    });
  }

  function isLoaded(id) {
    return state.person[id];
  }

  ensureCorrectDeck(resource, person_id, isLoaded, setPerson);

  const person = state.person[person_id] || { id: person_id };
  const notes = NoteHolder(person, setPerson, state, dispatch);

  const personForm = <PersonForm id={ person_id }
                                 name={ person.name }
                                 age={ person.age }
                                 birth_date = { person.birth_date }
                                 birth_location={ person.birth_location }
                                 death_date = { person.death_date }
                                 death_location={ person.death_location }
                                 update={ setPerson }
                     />;
  const formHandler = FormHandler({
    resource,
    id: person_id,
    noteContainer: person,
    setNoteContainer: setPerson,
    title: person.name,
    form: personForm
  });

  const isPersonDead = () => {
    return person.death_date !== null;
  };

  const buildDeath = () => {
    return (
      <Death person={ person }/>
    );
  };

  return (
    <article>
      { formHandler }
      <Birth person={ person }/>
      { isPersonDead() && buildDeath() }
      <Age person={ person }/>
      <section className="person-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ person }/>
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
