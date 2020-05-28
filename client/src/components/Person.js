import React, { useState } from 'react';

import Net from '../lib/Net';

import SectionLinkBack from './SectionLinkBack';
import PersonForm from './PersonForm';
import PointForm from './PointForm';
import { idParam } from '../lib/reactUtils';
import { useStateValue } from '../lib/StateProvider';
import DeckManager from './DeckManager';
import ListDeckPoints from './ListDeckPoints';

import Graph from './Graph';

export default function Person(props) {
  const [state, dispatch] = useStateValue();
  const [showBirthForm, setShowBirthForm] = useState(false);

  const personId = idParam();
  const person = state.cache.deck[personId] || { id: personId };

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
    Net.post(`/api/people/${personId}/points`, point).then(person => {
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
    return (
      <PointForm readOnlyTitle point={ point }
                 onSubmit={ onAddBirthPoint }
                 submitMessage="Create Birth Point"/>
    );
  }

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes || person.linkbacks_to_decks;

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
      { okToShowGraph && <Graph id = { personId } depth={ 2 } /> }
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
