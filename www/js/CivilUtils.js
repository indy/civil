import { useEffect, html, route } from '/lib/preact/mod.js';

import { getAppState, AppStateChange } from '/js/AppState.js';
import Net from '/js/Net.js';

export function deckTitle(deck) {
    let title = deck && (deck.title || deck.name || '');
    return title;
}

export function createDeck(resource, title) {
    // creates a new deck
    const data = {
        title: title
    };

    Net.post(`/api/${resource}`, data).then(deck => {
        Net.get(`/api/${resource}/listings`).then(listing => {
            AppStateChange.setDeckListing(resource, listing);
            AppStateChange.invalidateGraph();
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
    const appState = getAppState();

    useEffect(() => {
        if(!appState.listing.value[resource]) {
            fetchDeckListing(resource, url);
        }
    }, []);
}

export function fetchDeckListing(resource, url) {
    Net.get(url || `/api/${resource}`).then(listing => {
        AppStateChange.setDeckListing(resource, listing);
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
