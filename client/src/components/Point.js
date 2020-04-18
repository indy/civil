import React, { useState } from 'react';
import PointForm from './PointForm';

export default function Point({ point, parentResource }) {
  const [showForm, setShowForm] = useState(false);

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

  let dom;
  const date = point.date_textual;
  const location = point.location_textual;

  if (parentResource === "events" && point.title === "Prime") {
    dom = <p className="subtitle">{ date } { location }</p>;
  } else {
    let text;
    if (location && location.length > 0) {
      if (point.title === "Born" || point.title === "Died") {
        text = `${date} ${point.title} in ${location}`;
      } else {
        // choosing not to display location, even though one is available
        // might change this later, or even use location to show a map
        text = `${date} ${point.title}`;
      }
    } else {
        text = `${date} ${point.title}`;
    }

    dom = <p className="subtitle">&mdash;{ text }</p>;
  }

  return (
    <div onClick={ onShowForm }>
      { dom }
      { showForm && buildShowForm () }
    </div>
  );
}
