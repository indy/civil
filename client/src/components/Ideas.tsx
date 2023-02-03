import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import Net from '../Net';
import { capitalise } from '../JsUtils';
import { getAppState, AppStateChange } from "../AppState";

import { DeckSimpleListSection } from './ListSections';

import { IIdeasListings, ISearchResults, IDeckSimple } from '../types';

import DeckManager from "./DeckManager";

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

function Idea({ path, id }: { path?: string, id?: string }) {
    const [searchResults, setSearchResults]: [Array<IDeckSimple>, any] = useState([]); // an array of backrefs
    const ideaId = id ? parseInt(id, 10) : 0;

    useEffect(() => {
        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.get<ISearchResults>(`/api/ideas/${id}/additional_search`).then(searchResults => {
            setSearchResults(searchResults.results);
        });
    }, [id]);

    const resource = "ideas";

    const deckManager = DeckManager({
        id: ideaId,
        resource,
        hasSummarySection: false,
        hasReviewSection: false
    });

    console.log(searchResults);
    console.log(ideaId);
    console.log(deckManager.isEditingDeckRefs);

    return (<div>Hello world</div>)
}

export { Ideas, Idea };
