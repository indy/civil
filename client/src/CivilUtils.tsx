// import { route } from "preact-router";
import { useEffect } from "preact/hooks";

import Net from './Net';

import { IDeckSimple } from './types';

// import { TOOLBAR_VIEW, TOOLBAR_EDIT, TOOLBAR_REFS, TOOLBAR_SR, TOOLBAR_ADD_ABOVE } from './components/DeluxeToolbar';
import { getAppState, AppStateChange } from './AppState';


/*
export function addToolbarSelectableClasses(toolbarMode) {
    switch (toolbarMode) {
    case TOOLBAR_EDIT:
        return " selectable-container-hovering selectable-container-hovering-edit";
    case TOOLBAR_REFS:
        return " selectable-container-hovering selectable-container-hovering-refs";
    case TOOLBAR_SR:
        return " selectable-container-hovering selectable-container-hovering-sr";
    case TOOLBAR_ADD_ABOVE:
        return " selectable-container-hovering selectable-container-hovering-add-above";
    }
}
*/
export function deckTitle(deck: any) {
    let title = deck && (deck.title || deck.name || '');
    return title;
}
/*
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
*/
export function ensureListingLoaded(resource: string, url: string) {
    console.error("REPLACE ensureListingLoaded WITH ILISTING SPECIFIC VARIANTS");

    const appState = getAppState();

    useEffect(() => {
        if(!appState.listing.value[resource]) {
            fetchDeckListing(resource, url);
        }
    }, []);
}

export function fetchDeckListing(resource: string, url: string) {
    console.error("REPLACE fetchDeckListing WITH ILISTING SPECIFIC VARIANTS");
    Net.get<Array<IDeckSimple>>(url || `/api/${resource}`).then(listing => {
        AppStateChange.setDeckListing(resource, listing);
    });
}

export function sortByResourceThenName(a: any, b: any) {
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
