import React, { useState } from 'react';

import Net from '../lib/Net';

import SectionLinkBack from './SectionLinkBack';
import PersonForm from './PersonForm';
import PointForm from './PointForm';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';
import DeckManager from './DeckManager';
import ListDeckPoints from './ListDeckPoints';

export default function Person(props) {
  const [state, dispatch] = useStateValue();
  const [showBirthForm, setShowBirthForm] = useState(false);

  const person_id = idParam();
  const person = state.cache.deck[person_id] || { id: person_id };

  const deckManager = DeckManager({
    deck: person,
    title: person.name,
    resource: "people",
    updateForm: <PersonForm person={person} editing />
  });

  function onShowBirthForm() {
    setShowBirthForm(!showBirthForm);
  }

  function showAddBirthPointMessage() {
    return (<p className="fakelink"
               onClick={ onShowBirthForm }>You should add a birth point for this person</p>);
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
    return (<PointForm readOnlyTitle point={ point }
                       onSubmit={ onAddBirthPoint }
                       submitMessage="Create Birth Point"/>);
  }

  return (
    <article>
      { deckManager.title }
      { deckManager.buttons }
      { deckManager.noteForm }
      { deckManager.pointForm }
      { deckManager.updateForm }

      { hasNoBirthPoint(person) && showAddBirthPointMessage() }
      { showBirthForm && birthForm() }

      { deckManager.notes }
      <SectionLinkBack linkbacks={ person.linkbacks_to_decks }/>
      <ListDeckPoints deckPoints={ person.all_points_during_life }
                      holderId={ person.id }
                      holderName={ person.name }/>
    </article>
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
