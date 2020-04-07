import { useParams } from 'react-router-dom';
import { useState } from 'react';

import Net from './Net';
import NoteUtils from '../lib/NoteUtils';

export const ensureCorrectDeck = (resource, id, isLoaded, setDeck) => {
  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$DECK/:id page and follow a Link to another /$DECK/:id
    // (where $DECK is the same deck type)
    //
    setCurrentId(id);

    if(!isLoaded(id)) {
      // fetch idea from the server
      const url = `/api/${resource}/${id}`;
      Net.get(url).then(s => {
        if (s) {
          setDeck(NoteUtils.applyTagsAndDecksToNotes(s));
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
};

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
