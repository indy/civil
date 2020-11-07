import { useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

export function ensureListingLoaded(resource, url) {
  const [state, dispatch] = useStateValue();

  useEffect(() => {
    async function fetcher() {
      const listing = await Net.get(url || `/api/${resource}`);
      dispatch({
        type: 'setDeckListing',
        resource,
        listing
      });
    }

    if(!state.deckkindsLoaded[resource]) {
      fetcher();
    }
  }, []);
}

export function setDeckListing(dispatch, resource, listing) {
  dispatch({
    type: 'setDeckListing',
    resource,
    listing
  });
}

export function addAutocompleteDeck(dispatch, id, name, resource) {
  dispatch({
    type: 'addAutocompleteDeck',
    id,
    name,
    resource
  });
}
