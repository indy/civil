import React from 'react';

import NoteHolder from './NoteHolder';
import PointForm from './PointForm';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Point(props) {
  const [state] = useStateValue();
  const pointId = idParam();
  const point = state.point[pointId] || { id: pointId };
  const pointForm = <PointForm point={ point } setMsg="setPoint" />;

  return (
    <NoteHolder
      holder={ point }
      setMsg="setPoint"
      title={ point.title }
      resource="points"
      isLoaded={ id => state.point[id] }
      updateForm={ pointForm }>
      <PointTime point={ point }/>
      <PointPlace point={ point }/>
    </NoteHolder>
  );
}

function PointTime(props) {
  let timeToDisplay = '';
  if (props.point.date) {
    timeToDisplay = props.point.date.textual;
  }

  return (
    <p className="subtitle">
      Time: { timeToDisplay }
    </p>
  );
}

function PointPlace(props) {
  let locationToDisplay = '';
  if (props.point.location) {
    locationToDisplay = props.point.location.textual;
  }

  return (
    <p className="subtitle">
      Place: { locationToDisplay }
    </p>
  );
}
