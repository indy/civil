import React, { useState } from 'react';

import Net from '../lib/Net';
import NoteHolder from './NoteHolder';
import PersonForm from './PersonForm';
import PointForm from './PointForm';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Person(props) {
  const [state, dispatch] = useStateValue();
  const [showBirthForm, setShowBirthForm] = useState(false);

  const person_id = idParam();
  const person = state.person[person_id] || { id: person_id };
  const personForm = <PersonForm person={person} setMsg="setPerson" />;

  function onShowBirthForm() {
    setShowBirthForm(!showBirthForm);
  }

  function showAddBirthPointMessage() {
    return (<p className="fakelink" onClick={ onShowBirthForm }>You should add a birth point for this person</p>);
  }

  function onAddBirthPoint(point) {
    // post to /api/people/{id}/points
    Net.post(`/api/people/${person_id}/points`, point).then(person => {
      setShowBirthForm(false);
      dispatch({
        type: 'setPerson',
        id: person.id,
        newItem: person
      });

      // also update the people list now that this person is no longer uncategorised
      Net.get('/api/people').then(people => {
        dispatch({
          type: 'setPeople',
          people
        });
      });
    });
  }

  function birthForm() {
    let point = {
      title: 'Born'
    };
    return (<PointForm point={ point } onSubmit={ onAddBirthPoint } submitMessage="Create Point"/>);
  }

  return (
    <NoteHolder
      holder={ person }
      setMsg="setPerson"
      title={ person.name }
      resource="people"
      isLoaded={ id => state.person[id] }
      updateForm={ personForm }>
      { hasNoBirthPoint(person) && showAddBirthPointMessage() }
      { showBirthForm && birthForm() }
    </NoteHolder>
  );
}

function hasNoBirthPoint(person) {
  function hasBirthPoint(point) {
    return point.title === "Born";
  }

  if (person.points) {
    return !person.points.find(hasBirthPoint);
  };
  return false;
}
