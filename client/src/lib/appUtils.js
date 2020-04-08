import { useParams } from 'react-router-dom';

import Net from './Net';

export const ensureAC = (state, dispatch) => {
  if (!state.acLoaded) {
    Net.get('/api/autocomplete/tags').then(tags => {
      Net.get('/api/autocomplete/decks').then(decks => {
        dispatch({
          type: 'loadAutocomplete',
          tags,
          decks
        });
      });
    });
  }
};

export const idParam = () => {
  const { id } = useParams();
  return parseInt(id, 10);
};
