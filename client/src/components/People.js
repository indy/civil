import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import { ensureAC } from '../lib/utils';
import { era, filterBefore, filterAfter, filterBetween } from '../lib/eras';

export default function People() {
  const [state, dispatch] = useStateValue();
  let [showAddPersonLink, setShowAddPersonLink] = useState(false);
  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const people = await Net.get('/api/people');
      dispatch({
        type: 'setPeople',
        people
      });
    }
    if(!state.peopleLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddPersonLink(!showAddPersonLink);
  };

  const uncategorisedPeopleList = filterAfter(state.people, era.uncategorisedYear).map(createPersonListing);
  const ancientPeopleList = filterBefore(state.people, era.ancientCutoff).map(createPersonListing);
  const medievalPeopleList = filterBetween(state.people, era.ancientCutoff, era.medievalCutoff).map(createPersonListing);
  const modernPeopleList = filterBetween(state.people, era.medievalCutoff, era.modernCutoff).map(createPersonListing);
  const contemporaryPeopleList = filterBetween(state.people, era.modernCutoff, era.uncategorisedYear).map(createPersonListing);

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>People</h1>
      {showAddPersonLink && <Link to='/add-person'>Add Person</Link>}
      { peopleList(uncategorisedPeopleList, "Uncategorised")}
      { peopleList(ancientPeopleList, "Ancient")}
      { peopleList(medievalPeopleList, "Medieval")}
      { peopleList(modernPeopleList, "Modern")}
      { peopleList(contemporaryPeopleList, "Contemporary")}
    </div>
  );
}

function peopleList(list, heading) {
  return (<div>
            { !!list.length && <h2>{ heading }</h2> }
            <ul className="people-list">
              { list }
            </ul>
          </div>);
}

function createPersonListing(person) {
  return <ListingLink id={ person.id } key={ person.id } name={ person.name } resource='people'/>;
}
