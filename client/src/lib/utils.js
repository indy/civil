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
