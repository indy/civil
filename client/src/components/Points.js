import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';
import { useStateValue } from '../state';

export default function Points() {
  const [state, dispatch] = useStateValue();
  let [showAddPointLink, setShowAddPointLink] = useState(false);

  useEffect(() => {
    async function fetcher() {
      const points = await Net.get('/api/points');

      dispatch({
        type: 'setPoints',
        points
      });
    }
    if(!state.pointsLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddPointLink(!showAddPointLink);
  };

  const pointsList = state.points.map(
    point => <ListingLink id={ point.id } key={ point.id } name={ point.title } resource='points'/>
  );

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
