import { useState } from 'react';

import Net from './Net';
import NoteUtils from '../lib/NoteUtils';

export default function ensureCorrectDeck(id, setDeck, resource) {
  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$DECK/:id page and follow a Link to another /$DECK/:id
    // (where $DECK is the same deck type)
    //
    fetchDeck();
  }

  function fetchDeck() {
    setCurrentId(id);

    const url = `/api/${resource}/${id}`;
    Net.get(url).then(s => {
      if (s) {
        setDeck(NoteUtils.applyTagsAndDecksToNotes(s));
      } else {
        console.error(`error: fetchDeck for ${url}`);
      }
    });
  };
}
