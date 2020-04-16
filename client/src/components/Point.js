import React, { useState } from 'react';
import PointForm from './PointForm';

export default function Point({ point, parentResource }) {
  const [showForm, setShowForm] = useState(false);

  const date = point.date_textual;
  const location = point.location_textual;
  // don't show the label for the main point of an Event (these will always be titled 'Event')
  //
  const title = (parentResource === "events" && point.title === "Event") ? "" : `${point.title}:`;

  function onShowForm() {
    setShowForm(!showForm);
  }

  function buildShowForm() {
    function handlePointFormSubmit(p) {
      console.log(p);
    }

    return (<PointForm point={ point }
                       onSubmit={ handlePointFormSubmit }
                       submitMessage="Update Point"></PointForm>);
  }

  return (
    <div onClick={ onShowForm }>
      <p className="subtitle">{ title } { date } { location }</p>
      { showForm && buildShowForm () }
    </div>
  );
}
