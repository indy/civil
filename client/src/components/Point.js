import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import NoteCreator from './NoteCreator';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Point(props) {
  const {id} = useParams();
  const point_id = parseInt(id, 10);

  const [point, setPoint] = useState({ id: point_id });

  ensureCorrectDeck(point_id, setPoint, "points");

  const creator = NoteCreator(point, setPoint, { deck_id: point_id }, point.title);
  const notes = NoteHolder(point, setPoint);

  return (
    <article>
      { creator }
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
