import { useEffect, html, route } from '/lib/preact/mod.js';

import { sc_invalidateGraph, sc_setDeckListing } from '/js/AppState.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

export function createDeck(state, resource, title) {
    // creates a new deck
    const data = {
        title: title
    };

    Net.post(`/api/${resource}`, data).then(deck => {
        Net.get(`/api/${resource}/listings`).then(listing => {
            sc_setDeckListing(state, resource, listing);
            sc_invalidateGraph(state);
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
    const state = useStateValue();

    useEffect(() => {
        if(!state.listing.value[resource]) {
            fetchDeckListing(state, resource, url);
        }
    }, []);
}

export function fetchDeckListing(state, resource, url) {
    Net.get(url || `/api/${resource}`).then(listing => {
        sc_setDeckListing(state, resource, listing);
    });
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
