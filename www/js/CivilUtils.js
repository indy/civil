import { useEffect, html } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

export function ensureListingLoaded(resource, url) {
  const [state, dispatch] = useStateValue();

  useEffect(() => {
    if(!state.listing[resource]) {
      fetchDeckListing(dispatch, resource, url);
    }
  }, []);
}

export async function fetchDeckListing(dispatch, resource, url) {
  const listing = await Net.get(url || `/api/${resource}`);
  setDeckListing(dispatch, resource, listing);
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

export function leftMarginHeading(content) {
  return html`
          <div class="left-margin-entry">
            <div class="left-margin-heading">
              ${ content }
            </div>
          </div>`;
}
