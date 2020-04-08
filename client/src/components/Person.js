import React from 'react';

import PersonForm from './PersonForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import {ensureCorrectDeck, idParam} from '../lib/appUtils';
import { useStateValue } from '../lib/state';

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
  const age = person.age || calculateAge(person.birth_date, person.death_date);

  return (
    <p className="subtitle">
      Age: { age }
    </p>
  );
};


function calculateAge(birth, death) {
    if (!birth) {
      return "";
    }

    let earlier = ymdFromObject(birth);
    let later = death ? ymdFromObject(death) : ymdFromNow();

    let ymdA = earlier.ymd;
    let ymdB = later.ymd;

    let years = ymdB[0] - ymdA[0];
    if (ymdB[1] < ymdA[1]) {
      years -= 1;
    } else if ((ymdB[1] === ymdA[1]) && (ymdB[2] < ymdA[2])) {
        years -= 1;
    };

    let res = (!earlier.isExact || !later.isExact) ? "Approx " : "";
    res += `${years}`;

    return res;
  }

// ymd == Year, Month, Day

function ymdFromNow() {
  const d = new Date();
  return {
    ymd: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
    isExact: true
  };
}

function ymdFromObject(date) {
  if (date.exact_date) {
    // happy days
    return {
      ymd: parseYmdFromString(date.exact_date),
      isExact: true
    };
  }

  if (date.lower_date && date.upper_date) {
    // get a year roughly inbetween the lower and upper bounds
    let lower = parseYmdFromString(date.lower_date);
    let upper = parseYmdFromString(date.upper_date);

    return {
      ymd: [Math.floor((lower[0] + upper[0]) / 2), lower[1], lower[2]],
      isExact: false
    };
  }

  if (date.lower_date) {
    return {
      ymd: parseYmdFromString(date.lower_date),
      isExact: false
    };
  }

  if (date.upper_date) {
    return {
      ymd: parseYmdFromString(date.upper_date),
      isExact: false
    };
  }

  console.error(`can't determine year/month/day from ${date}`);
  return undefined;
}

function parseYmdFromString(s) {
  let res = [];
  let parts = s.split("-");
  if (parts.length === 4) {
    res = [-parseInt(parts[1], 10), parseInt(parts[2], 10), parseInt(parts[3], 10)];
  } else if (parts.length === 3) {
    res = [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
  } else {
    console.error(`invalid date string given to parseYmdFromString: ${s}`);
  }

  return res;
}
