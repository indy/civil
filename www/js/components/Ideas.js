import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { ensureListingLoaded, leftMarginHeading } from '/js/CivilUtils.js';
import { capitalise, formattedDate } from '/js/JsUtils.js';

import CivilInput from '/js/components/CivilInput.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';
import { DeckManager } from '/js/components/DeckManager.js';

function Ideas() {
    const [state, dispatch] = useStateValue();
    const resource = 'ideas';

    ensureListingLoaded(resource, '/api/ideas/listings');

    const ideas = state.listing.ideas || {};

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>
        <${DeckSimpleListSection} label='Recent' list=${ideas.recent} expanded/>
        <${DeckSimpleListSection} label='Orphans' list=${ideas.orphans} hideEmpty/>
        <${DeckSimpleListSection} label='Unnoted' list=${ideas.unnoted} hideEmpty/>
    </article>`;
}

function Idea({ id }) {
    const [searchResults, setSearchResults] = useState([]); // an array of backrefs

    const ideaId = parseInt(id, 10);

    useEffect(() => {
        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.get(`/api/ideas/${id}/additional_search`).then(search_results => {
            setSearchResults(search_results.results);
        });
    }, [id]);

    const deckManager = DeckManager({
        id: ideaId,
        resource: "ideas",
        updateForm: UpdateIdeaForm,
        hasSummarySection: false,
        hasReviewSection: false
    });

    return html`
    <article>
        <div>
            <${IdeaTopMatter}/>
            ${ deckManager.title }
        </div>
        ${ deckManager.buildUpdateForm() }
        ${ deckManager.buildDeleteForm() }
        ${ deckManager.buildDeckRefSection() }
        ${ deckManager.buildNoteSections() }
        ${ deckManager.buildSectionBackRefs() }

        <${SectionSearchResultsBackref} backrefs=${ searchResults }/>

        ${ deckManager.buildGraphSection() }
    </article>`;
}

function IdeaTopMatter() {
    const [state] = useStateValue();

    let createdAt = state.deckManagerState.deck && state.deckManagerState.deck.created_at;

    return html`<div class="left-margin">
                     ${ createdAt && leftMarginHeading(formattedDate(createdAt)) }
                </div>`;
}


function UpdateIdeaForm({ deck, hideFormFn, deckModifiedFn }) {
    const idea = deck || {};
    const [state, dispatch] = useStateValue();
    const [title, setTitle] = useState(idea.title || '');
    const [graphTerminator, setGraphTerminator] = useState(idea.graph_terminator);

    useEffect(() => {
        if (idea.title && idea.title !== '' && title === '') {
            setTitle(idea.title);
        }
    }, [idea]);

    const handleChangeEvent = (event) => {
        const target = event.target;
        const name = target.name;
        const value = target.value;

        if (name === "title") {
            setTitle(value);
        }
    };

    const handleSubmit = (event) => {
        const data = {
            title: title.trim(),
            graph_terminator: graphTerminator
        };

        Net.put(`/api/ideas/${idea.id}`, data).then(newItem => {
            deckModifiedFn(newItem);
            hideFormFn();
        });

        event.preventDefault();
    };

    const handleCheckbox = (event) => {
        if (event.target.id === 'graph-terminator') {
            setGraphTerminator(!graphTerminator);
        }
    }

    return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
        <label for="title">Title:</label>
        <br/>
        <${CivilInput} id="title"
                       value=${ title }
                       onInput=${ handleChangeEvent } />
        <br/>
        <label for="graph-terminator">Graph Terminator:</label>
        <input type="checkbox"
               id="graph-terminator"
               name="graph-terminator"
               onInput=${ handleCheckbox }
               checked=${graphTerminator}/>
        <br/>
        <input type="submit" value="Update Idea"/>
    </form>`;
}

export { Ideas, Idea };
