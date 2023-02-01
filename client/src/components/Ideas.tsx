import { h } from "preact";
import { useEffect } from "preact/hooks";

import Net from '../Net';
import { capitalise } from '../JsUtils';
import { getAppState, AppStateChange } from "../AppState";

import { DeckSimpleListSection } from './ListSections';

import { IIdeasListings } from '../types';

function Ideas({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = 'ideas';

    useEffect(() => {
        if(!appState.listing.value.ideas) {
            let url: string = '/api/ideas/listings';
            Net.get<IIdeasListings>(url).then(listing => {
                AppStateChange.setIdeasListing(listing);
            });
        }
    }, []);

    const ideas = appState.listing.value.ideas;

    if (ideas) {
        return (
            <article>
                <h1 class="ui">{capitalise(resource)}</h1>
                <DeckSimpleListSection label='Recent' list={ideas.recent} expanded/>
                <DeckSimpleListSection label='Orphans' list={ideas.orphans} hideEmpty/>
                <DeckSimpleListSection label='Unnoted' list={ideas.unnoted} hideEmpty/>
                </article>);
    } else {
        return <div></div>
    }
}

export { Ideas };
