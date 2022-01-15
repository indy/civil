import { useEffect, html, route } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

export function createDeck(dispatch, resource, title) {
  // creates a new deck
  const data = {
    title: title
  };

  Net.post(`/api/${resource}`, data).then(deck => {
    Net.get(`/api/${resource}/listings`).then(listing => {
      setDeckListing(dispatch, resource, listing);
      invalidateGraph(dispatch);
    });
    route(`/${resource}/${deck.id}`);
  });
}

export function indexToShortcut(index) {
  if (index < 9) {
    return String.fromCharCode(index + 49);
  } else {
    return String.fromCharCode((index - 9) + 65).toLowerCase();
  }
}

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

export function leftMarginHeading(content) {
  return html`
          <div class="left-margin-entry">
            <div class="left-margin-heading">
              ${ content }
            </div>
          </div>`;
}

export function leftMarginHeadingNoWrap(content) {
  return html`
          <div class="left-margin-entry-no-wrap">
            <div class="left-margin-heading">
              ${ content }
            </div>
          </div>`;
}


export function sortByResourceThenName(a, b) {
  if (a.resource < b.resource) {
    return -1;
  }
  if (a.resource > b.resource) {
    return 1;
  }

  let nameA = a.name.toUpperCase();
  let nameB = b.name.toUpperCase();
  if (nameA < nameB) {
    return -1;
  }

  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;

}

export function sortByTitle(a, b) {
  let nameA = a.title.toUpperCase();
  let nameB = b.title.toUpperCase();

  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}


function setDeckListing(dispatch, resource, listing) {
  dispatch({
    type: 'setDeckListing',
    resource,
    listing
  });
}

function invalidateGraph(dispatch) {
  dispatch({
    type: 'invalidateGraph'
  });
}
