import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';

export default function Points() {
  const [points, setPoints] = useState([]);
  let [showAddPointLink, setShowAddPointLink] = useState(false);

  useEffect(() => {
      async function fetcher() {
        const p = await Net.get('/api/points');
        setPoints(p);
      }
      fetcher();
  }, []);

  const toggleShowAdd = () => {
    setShowAddPointLink(!showAddPointLink);
  };

  const pointsList = points.map(point => <ListingLink id={ point.id } key={ point.id } name={ point.title } resource='points'/>);

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Points</h1>
      { showAddPointLink && <Link to='/add-point'>Add Point</Link> }
      <ul>
        { pointsList }
      </ul>
    </div>
  );
}
