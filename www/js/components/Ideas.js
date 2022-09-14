import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { ensureListingLoaded } from '/js/CivilUtils.js';
import { capitalise, formattedDate } from '/js/JsUtils.js';

import CivilInput from '/js/components/CivilInput.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import LeftMarginHeading from '/js/components/LeftMarginHeading.js';
import SectionGraph from '/js/components/SectionGraph.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionNotes from '/js/components/SectionNotes.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import DeckManager from '/js/components/DeckManager.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';
import Title from '/js/components/Title.js';

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

function preCacheFn(d) {
    return d;
}

function Idea({ id }) {
    const [searchResults, setSearchResults] = useState([]); // an array of backrefs
    console.log("idea");
    const ideaId = parseInt(id, 10);

    useEffect(() => {
        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.get(`/api/ideas/${id}/additional_search`).then(searchResults => {
            setSearchResults(searchResults.results);
        });
    }, [id]);

    const deckManager = DeckManager({
        id: ideaId,
        resource: "ideas",
        preCacheFn: preCacheFn,
        hasSummarySection: false,
        hasReviewSection: false
    });

    return html`
    <article>
        <${IdeaTopMatter} title=${deckManager.title}/>
        <${SectionUpdateIdea}/>
        <${DeleteDeckConfirmation} resource='ideas' id=${ideaId}/>
        <${SectionDeckRefs} onRefsChanged=${ deckManager.onRefsChanged }/>

        <${SectionNotes} title=${ deckManager.title } onRefsChanged=${ deckManager.onRefsChanged } preCacheFn=${preCacheFn} resource="ideas"/>

        <${SectionBackRefs} deckId=${ ideaId }/>
        <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
        <${SectionGraph} depth=${ 2 } />
    </article>`;
}

function IdeaTopMatter({ title }) {
    const [state] = useStateValue();

    let createdAt = state.deckManagerState.deck && state.deckManagerState.deck.createdId;

    return html`
    <div>
        <div class="left-margin">
            <${LeftMarginHeading}>
                ${ createdAt && formattedDate(createdAt)}
            </${LeftMarginHeading}>
        </div>
        <${Title} title=${ title }/>
    </div>`;
}


function SectionUpdateIdea() {
    const [state, appDispatch] = useStateValue();

    const idea = state.deckManagerState.deck || {};

    const [title, setTitle] = useState(idea.title || '');
    const [graphTerminator, setGraphTerminator] = useState(idea.graphTerminator);

    useEffect(() => {
        if (idea.title && idea.title !== '' && title === '') {
            setTitle(idea.title);
        }
        if (idea.graphTerminator !== undefined) {
            setGraphTerminator(idea.graphTerminator);
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
            graphTerminator: graphTerminator
        };

        Net.put(`/api/ideas/${idea.id}`, data).then(newDeck => {
            appDispatch({type: 'dms-update-deck', data: { deck: newDeck, resource: 'ideas'}});
            appDispatch({type: 'dms-hide-form'});
        });

        event.preventDefault();
    };

    const handleCheckbox = (event) => {
        if (event.target.id === 'graph-terminator') {
            setGraphTerminator(!graphTerminator);
        }
    }

    if (!state.deckManagerState.showUpdateForm) {
        return html`<div></div>`;
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
