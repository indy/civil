import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import PointForm from './PointForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Point(props) {
  const {id} = useParams();
  const point_id = parseInt(id, 10);

  const [point, setPoint] = useState({ id: point_id });

  const resource = "points";
  ensureCorrectDeck(point_id, setPoint, resource);

  const notes = NoteHolder(point, setPoint);
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
