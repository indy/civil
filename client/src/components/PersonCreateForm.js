import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

export default function PersonCreateForm(props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [redirectUrl, setRedirectUrl] = useState(false);
  const [birth_date, setBirthDate] = useState('');
  const [birth_location, setBirthLocation] = useState('');
  const [death_date, setDeathDate] = useState('');
  const [death_location, setDeathLocation] = useState('');

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
    const cleanState = StateUtils.removeEmptyObjects(sendState);

    if (!cleanState.birth_date || !cleanState.birth_location) {
      console.error("a person requires both birth date and birth location information");
    } else {
      const data = JSON.stringify(cleanState);
      Net.createThenRedirectHook(setRedirectUrl, "people", data);
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
              <CivilDate id="birth_date" onDateChange={handleCivilDateChange}/>
              <br/>
              <CivilLocation id="birth_location" onLocationChange={handleCivilLocationChange}/>
            </fieldset>

            <fieldset>
              <legend>Died</legend>
              <CivilDate id="death_date" onDateChange={handleCivilDateChange}/>
              <br/>
              <CivilLocation id="death_location" onLocationChange={handleCivilLocationChange}/>
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
