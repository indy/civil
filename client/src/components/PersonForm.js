import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

export default function PersonForm(props) {
  const [name, setName] = useState(props.name || '');
  const [age, setAge] = useState(props.age || '');
  const [birth_date, setBirthDate] = useState(props.birth_date);
  const [birth_location, setBirthLocation] = useState(props.birth_location);
  const [death_date, setDeathDate] = useState(props.death_date);
  const [death_location, setDeathLocation] = useState(props.death_location);
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (props.name && props.name !== '' && name === '') {
    setName(props.name);
  }
  if (props.age && props.age !== '' && age === '') {
    setAge(age.name);
  }
  if (props.birth_date && props.birth_date.textual !== '' && !birth_date) {
    setBirthDate(props.birth_date);
  }
  if (props.birth_location && props.birth_location !== '' && !birth_location) {
    setBirthLocation(props.birth_location);
  }
  if (props.death_date && props.death_date.textual !== '' && !death_date) {
    setDeathDate(props.death_date);
  }
  if (props.death_location && props.death_location !== '' && !death_location) {
    setDeathLocation(props.death_location);
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
    const data = StateUtils.removeEmptyObjects(sendState);

    if (!data.birth_date || !data.birth_location) {
      console.error("a person requires both birth date and birth location information");
    } else {
      if(props.update) {
        // edit an existing point
        Net.put(`/api/people/${props.id}`, data).then(props.update);
      } else {
        // create a new point
        Net.post('/api/people', data).then(person => {
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
