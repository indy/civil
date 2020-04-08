import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';
import { useStateValue } from '../lib/state';
import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

export default function PointForm(props) {
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(props.title || '');
  const [date, setDate] = useState(props.date);
  const [location, setLocation] = useState(props.location);
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (props.title && props.title !== '' && title === '') {
    setTitle(props.title);
  }
  if (props.date && props.date.textual !== '' && !date) {
    setDate(props.date);
  }
  if (props.location && props.location !== '' && !location) {
    setLocation(props.location);
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

    if(props.update) {
      // edit an existing point
      Net.put(`/api/points/${props.id}`, data).then(props.update);
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
