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

// remove any child objects from obj which are empty
export function removeEmptyObjects(obj) {
  const keys = Object.keys(obj);
  for(var i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (Object.entries(obj[key]).length === 0 && obj[key].constructor === Object) {
      delete obj[key];
    }
  }
  return obj;
}

// remove the keys from obj that have empty strings
export function removeEmptyStrings(obj, keys) {
  for(var i= 0; i < keys.length; i++) {
    let key = keys[i];
    if (typeof obj[key] === 'string' && obj[key].trim().length === 0) {
      delete obj[key];
    }
  }
  return obj;
}

export function capitalise(text) {
  const capitaliseWord = word => word.slice(0, 1).toUpperCase() + word.slice(1);
  return text.split(' ').map(capitaliseWord).join(' ');
}
