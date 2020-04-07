import React from 'react';

import PointForm from './PointForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import {ensureCorrectDeck, idParam} from '../lib/appUtils';
import { useStateValue } from '../state';

export default function Point(props) {
  const [state, dispatch] = useStateValue();
  const point_id = idParam();
  const resource = "points";

  function setPoint(newPoint) {
    dispatch({
      type: 'setPoint',
      id: point_id,
      point: newPoint
    });
  }

  function isLoaded(id) {
    return state.point[id];
  }

  ensureCorrectDeck(resource, point_id, isLoaded, setPoint);

  const point = state.point[point_id] || { id: point_id };
  const notes = NoteHolder(point, setPoint, state, dispatch);

  const pointForm = <PointForm id={ point_id }
                               title={ point.title }
                               date = { point.date}
                               location={ point.location }
                               update={ setPoint }
                    />;
  const formHandler = FormHandler({
    resource,
    id: point_id,
    noteContainer: point,
    setNoteContainer: setPoint,
    title: point.title,
    form: pointForm
  });

  return (
    <article>
      { formHandler }
      <PointTime point={ point }/>
      <PointPlace point={ point }/>
      <section className="point-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ point }/>
    </article>
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
