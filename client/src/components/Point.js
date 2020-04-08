import React from 'react';

import PointForm from './PointForm';
import {idParam} from '../lib/appUtils';
import { useStateValue } from '../lib/state';
import NoteHolder from './NoteHolder';

export default function Point(props) {
  const [state, dispatch] = useStateValue();
  const point_id = idParam();

  const point = state.point[point_id] || { id: point_id };
  function setPoint(newPoint) {
    dispatch({
      type: 'setPoint',
      id: point_id,
      point: newPoint
    });
  }

  const pointForm = <PointForm id={ point_id }
                               title={ point.title }
                               date = { point.date}
                               location={ point.location }
                               update={ setPoint }
                    />;

  return (
    <NoteHolder
      holder={ point }
      setHolder={setPoint}
      title={point.title}
      resource="points"
      isLoaded={ id => state.point[id] }
      updateForm={pointForm}>
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
