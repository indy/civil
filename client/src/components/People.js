import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../state';

export default function People() {
  const [state, dispatch] = useStateValue();
  let [showAddPersonLink, setShowAddPersonLink] = useState(false);

  useEffect(() => {
    async function fetcher() {
      const people = await Net.get('/api/people');
      people.forEach(addBirthYear);

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

  const ancientCutoff = 354;
  const medievalCutoff = 1469;
  const modernCutoff = 1856;

  const ancientPeopleList = state.people
        .filter(person => person.birth_year < ancientCutoff)
        .sort((a, b) => a.birth_year > b.birth_year)
        .map(createPersonListing);
  const medievalPeopleList = state.people
        .filter(person => person.birth_year >= ancientCutoff && person.birth_year < medievalCutoff)
        .sort((a, b) => a.birth_year > b.birth_year)
        .map(createPersonListing);
  const modernPeopleList = state.people
        .filter(person => person.birth_year >= medievalCutoff && person.birth_year < modernCutoff)
        .sort((a, b) => a.birth_year > b.birth_year)
        .map(createPersonListing);
  const contemporaryPeopleList = state.people
        .filter(person => person.birth_year >= modernCutoff)
        .sort((a, b) => a.birth_year > b.birth_year)
        .map(createPersonListing);

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>People</h1>
      {showAddPersonLink && <Link to='/add-person'>Add Person</Link>}
      <h2>Ancient</h2>
      <ul className="people-list">
        { ancientPeopleList }
      </ul>
      <h2>Medieval</h2>
      <ul className="people-list">
        { medievalPeopleList }
      </ul>
      <h2>Modern</h2>
      <ul className="people-list">
        { modernPeopleList }
      </ul>
      <h2>Contemporary</h2>
      <ul className="people-list">
        { contemporaryPeopleList }
      </ul>
    </div>
  );
}

function yearFrom(dateString) {
  let res = 0;
  if (dateString[0] === '-') {
    res = parseInt(dateString.slice(0, 5), 10);
  } else {
    res = parseInt(dateString.slice(0, 4), 10);
  }
  return res;
}

function addBirthYear(p) {
  p.birth_year = yearFrom(p.birth_date.exact_date);
}

function createPersonListing(person) {
  return <ListingLink id={ person.id } key={ person.id } name={ person.name } resource='people'/>;
}
