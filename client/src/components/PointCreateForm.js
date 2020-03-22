import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

export default function PointCreateForm(props) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [redirectUrl, setRedirectUrl] = useState(false);

  const handleChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setTitle(value);
  };

  const handleCivilDateChange = (id, dateNew) => {
    setDate(dateNew);
  };

  const handleCivilLocationChange = (id, locationNew) => {
    setLocation(locationNew);
  };

  const handleSubmit = (event) => {
    const cleanState = StateUtils.removeEmptyObjects({title, date, location});
    const data = JSON.stringify(cleanState);
    console.log(`sending: ${data}`);
    Net.createThenRedirectHook(setRedirectUrl, "points", data);
    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <article>
        <section>
          <form onSubmit={ handleSubmit }>
            <div>
              <label htmlFor="title">Title:</label>
              <input id="title"
                     type="text"
                     name="title"
                     value={ title }
                     autoComplete="off"
                     onChange={ handleChangeEvent } />
            </div>
            <br/>
            <CivilDate id="point-date" onDateChange={handleCivilDateChange}/>
            <br/>
            <CivilLocation id="point-location" onLocationChange={handleCivilLocationChange}/>
            <br/>
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
