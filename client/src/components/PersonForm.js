import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyObjects } from '../lib/utils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';
import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

export default function PersonForm({ person, setMsg }) {
  const [state, dispatch] = useStateValue();
  const [name, setName] = useState(person.name || '');
  const [age, setAge] = useState(person.age || '');
  const [birth_date, setBirthDate] = useState(person.birth_date);
  const [birth_location, setBirthLocation] = useState(person.birth_location);
  const [death_date, setDeathDate] = useState(person.death_date);
  const [death_location, setDeathLocation] = useState(person.death_location);
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (person.name && person.name !== '' && name === '') {
    setName(person.name);
  }
  if (person.age && person.age !== '' && age === '') {
    setAge(age.name);
  }
  if (person.birth_date && person.birth_date.textual !== '' && !birth_date) {
    setBirthDate(person.birth_date);
  }
  if (person.birth_location && person.birth_location !== '' && !birth_location) {
    setBirthLocation(person.birth_location);
  }
  if (person.death_date && person.death_date.textual !== '' && !death_date) {
    setDeathDate(person.death_date);
  }
  if (person.death_location && person.death_location !== '' && !death_location) {
    setDeathLocation(person.death_location);
  }
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "name") {
      setName(value);
    } else if (name === "age") {
      setAge(value);
    }
  };

  const handleCivilDateChange = (id, date) => {
    if (id === "birth_date") {
      setBirthDate(date);
    } else if (id === "death_date") {
      setDeathDate(date);
    }
  };

  const handleCivilLocationChange = (id, location) => {
    if (id === "birth_location") {
      setBirthLocation(location);
    } else if (id === "death_location") {
      setDeathLocation(location);
    }
  };

  const handleSubmit = (event) => {
    let sendState = {
      name,
      age,
      birth_date,
      birth_location,
      death_date,
      death_location
    };
    const data = removeEmptyObjects(sendState);

    if (!data.birth_date || !data.birth_location) {
      console.error("a person requires both birth date and birth location information");
    } else {
      if(setMsg) {
        // edit an existing point
        Net.put(`/api/people/${person.id}`, data).then(newItem => {
          dispatch({
            type: setMsg,
            id: person.id,
            newItem
          });
        });
      } else {
        // create a new point
        Net.post('/api/people', data).then(person => {

          dispatch({
            type: 'addAutocompleteDeck',
            id: person.id,
            value: person.name,
            label: person.name
          });

          setRedirectUrl(`people/${person.id}`);
        });
      }
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <article>
        <section>
          <form onSubmit={ handleSubmit }>

            <label htmlFor="name">Name:</label>
            <input id="name"
                   type="text"
                   name="name"
                   value={ name }
                   autoComplete="off"
                   onChange={ handleChangeEvent } />

            <fieldset>
              <legend>Born</legend>
              <CivilDate id="birth_date" onDateChange={handleCivilDateChange} date={birth_date}/>
              <br/>
              <CivilLocation id="birth_location" onLocationChange={handleCivilLocationChange} location={birth_location}/>
            </fieldset>

            <fieldset>
              <legend>Died</legend>
              <CivilDate id="death_date" onDateChange={handleCivilDateChange} date={death_date}/>
              <br/>
              <CivilLocation id="death_location" onLocationChange={handleCivilLocationChange} location={death_location}/>
            </fieldset>

            <label htmlFor="age">Age:</label>
            <input id="age"
                   type="text"
                   name="age"
                   value={ age }
                   onChange={ handleChangeEvent } />

            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
