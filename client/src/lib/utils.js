import Net from './Net';

export function findPoint(points, title) {
  let p = points.find(p => p.title === title);
  if (p === undefined) {
    p = {};
  }
  return p;
}

export function separateIntoIdeasAndDecks(r) {
  return separateFromDecks(r, 'ideas');
}

export function applyDecksToNotes(obj) {
  let [ideas, decks] = separateIntoIdeasAndDecks(obj.decks_in_notes);
  const ideasInNotes = hashByNoteIds(ideas);
  const decksInNotes = hashByNoteIds(decks);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.ideas = ideasInNotes[n.id];
    n.decks = decksInNotes[n.id];
  }

  return obj;
}

export function ensureAC(state, dispatch) {
  if (!state.acLoaded) {
    Net.get('/api/autocomplete').then(decks => {
      dispatch({
        type: 'loadAutocomplete',
        decks
      });
    });
  }
};

// given an array of decks, separate out all decks of a particular resource, returning 2 arrays
function separateFromDecks(decks, resource) {
  return decks.reduce((acc, deck) => {
    acc[(deck.resource === resource) ? 0 : 1].push(deck);
    return acc;
  }, [[],[]]);
}

function hashByNoteIds(s) {
  s = s || [];
  return s.reduce(function(a, b) {
    const note_id = b.note_id;
    if (a[note_id]) {
      a[note_id].push(b);
    } else {
      a[note_id] = [b];
    }
    return a;
  }, {});
}
