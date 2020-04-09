import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';
import { useStateValue } from '../lib/state';
import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

export default function PointForm({point, setMsg}) {
  point = point || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(point.title || '');
  const [date, setDate] = useState(point.date);
  const [location, setLocation] = useState(point.location);
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (point.title && point.title !== '' && title === '') {
    setTitle(point.title);
  }
  if (point.date && point.date.textual !== '' && !date) {
    setDate(point.date);
  }
  if (point.location && point.location !== '' && !location) {
    setLocation(point.location);
  }
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

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
    const data = {title, date, location};

    if(setMsg) {
      // edit an existing point
      Net.put(`/api/points/${point.id}`, data).then(newItem => {
        dispatch({
          type: setMsg,
          id: point.id,
          newItem
        });
      });
    } else {
      // create a new point
      Net.post('/api/points', data).then(point => {

        dispatch({
          type: 'addAutocompleteDeck',
          id: point.id,
          value: point.title,
          label: point.title
        });

        setRedirectUrl(`points/${point.id}`);
      });
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
            <CivilDate id="point-date" onDateChange={handleCivilDateChange} date={date}/>
            <br/>
            <CivilLocation id="point-location" onLocationChange={handleCivilLocationChange} location={location}/>
            <br/>
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
