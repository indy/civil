import Net from './Net';

export function findPoint(points, title) {
  let p = points.find(p => p.title === title);
  if (p === undefined) {
    p = {};
  }
  return p;
}

export function separateIntoTagsAndDecks(r) {
  let tags = r.filter(d => d.resource === 'tags');
  let decks = r.filter(d => d.resource !== 'tags');
  return [tags, decks];
}

export function ensureAC(state, dispatch) {
  if (!state.acLoaded) {

    Net.get('/api/autocomplete').then(ac => {
      let [tags, decks] = separateIntoTagsAndDecks(ac);
      dispatch({
        type: 'loadAutocomplete',
        tags,
        decks
      });
    });

  }
};
