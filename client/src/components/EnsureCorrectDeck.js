import { useState } from 'react';
import Net from '../lib/Net';
import { applyDecksToNotes } from '../lib/utils';
import { addChronologicalSortYear } from '../lib/eras';
import { useStateValue } from '../lib/StateProvider';

export function ensureCorrectDeck(resource, id, isLoaded, setMsg) {
  const [state, dispatch] = useStateValue();
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$NOTE_HOLDER/:id page
    // and follow a Link to another /$NOTE_HOLDER/:id
    // (where $NOTE_HOLDER is the same type)
    //
    setCurrentId(id);

    if(!isLoaded(id)) {
      // fetch resource from the server
      const url = `/api/${resource}/${id}`;
      Net.get(url).then(s => {
        if (s) {
          let updatedHolder = applyDecksToNotes(s);
          sortPoints(updatedHolder);
          setHolder(dispatch, updatedHolder, setMsg);
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
};

function setHolder(dispatch, holder, setMsg) {
  dispatch({
    type: setMsg,
    id: holder.id,
    newItem: holder
  });
}


function sortPoints(holder) {
  if (holder.points) {
    holder.points = holder.points
        .map(addChronologicalSortYear)
        .sort((a, b) => a.sort_year > b.sort_year);
  }
}
