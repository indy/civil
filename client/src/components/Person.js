import React, { useState } from 'react';

import Net from '../lib/Net';

import SectionLinkBack from './SectionLinkBack';
import PersonForm from './PersonForm';
import PointForm from './PointForm';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/state';
import NoteManager from './NoteManager';
import DeckControls from './DeckControls';
import DeckPoint from './DeckPoint';
import Point from './Point';
import { ensureCorrectDeck } from './EnsureCorrectDeck';

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
    return (<PointForm readOnlyTitle point={ point } onSubmit={ onAddBirthPoint } submitMessage="Create Birth Point"/>);
  }

  const resource = "people";
  const setMsg = "setPerson";

  ensureCorrectDeck(resource, person.id, id => state.person[id], setMsg);
  const deckControls = DeckControls({
    holder: person,
    setMsg,
    title: person.name,
    resource,
    updateForm: personForm
  });

  const notes = NoteManager(person, setMsg);

  return (
    <article>
      { deckControls.title }
      { deckControls.buttons }
      { deckControls.noteForm }
      { deckControls.pointForm }
      { deckControls.updateForm }

      { hasNoBirthPoint(person) && showAddBirthPointMessage() }
      { showBirthForm && birthForm() }

      { person.points && showPoints(person.points, resource) }
      { notes }
      <SectionLinkBack linkbacks={ person.linkbacks_to_decks }/>
      { person.all_points_during_life && showPointsDuringLife(person.all_points_during_life, person.id, person.name) }
    </article>
  );
}

function showPoints(points, resource) {
  return points.map(p => <Point key={ p.id} point={ p } parentResource={ resource }/>);
}

function showPointsDuringLife(deckPoints, holderId, holderName) {
  let dps = deckPoints.map(dp => <DeckPoint key={ dp.point_id} holderId={ holderId } deckPoint={ dp }/>);

  return (
    <section>
      <h2>Events during the life of { holderName }</h2>
      <ul>
        { dps }
      </ul>
    </section>);
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
