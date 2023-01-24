import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { getAppState, AppStateChange } from '/js/AppState.js';
import { capitalise, formattedDate } from '/js/JsUtils.js';
import { ensureListingLoaded, deckTitle } from '/js/CivilUtils.js';

import { renderInsignia, InsigniaSelector } from '/js/components/Insignias.js';
import CivilInput from '/js/components/CivilInput.js';
import DeckManager from '/js/components/DeckManager.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import LeftMarginHeading from '/js/components/LeftMarginHeading.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionGraph from '/js/components/SectionGraph.js';
import SectionNotes from '/js/components/SectionNotes.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import Title from '/js/components/Title.js';
import { DeluxeToolbar, TOOLBAR_VIEW } from '/js/components/DeluxeToolbar.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';

function Ideas() {
    const appState = getAppState();
    const resource = 'ideas';

    ensureListingLoaded(resource, '/api/ideas/listings');

    const ideas = appState.listing.value.ideas || {};

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
        Net.get(`/api/ideas/${id}/additional_search`).then(searchResults => {
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

    let deck = deckManager.getDeck();

    return html`
    <article>
        <${DeluxeToolbar}/>
        <${IdeaTopMatter} title=${ deckTitle(deck) }
                          deck=${deck}
                          isShowingUpdateForm=${ deckManager.isShowingUpdateForm() }
                          isEditingDeckRefs=${ deckManager.isEditingDeckRefs() }
                          onRefsToggle=${ deckManager.onRefsToggle }
                          onFormToggle=${ deckManager.onFormToggle }/>
        ${ deckManager.isShowingUpdateForm() && html`
            <${DeleteDeckConfirmation} resource='ideas' id=${ideaId}/>
            <${SectionUpdateIdea} idea=${ deck } onUpdate=${ deckManager.updateAndReset }/>
        `}
        <${SectionDeckRefs} deck=${ deck }
                            isEditing=${ deckManager.isEditingDeckRefs() }
                            onRefsChanged=${ deckManager.onRefsChanged }
                            onRefsToggle=${ deckManager.onRefsToggle }/>
        <${SectionNotes} deck=${ deck }
                         resource="ideas"
                         title=${ deckTitle(deck) }
                         howToShowNoteSection=${ deckManager.howToShowNoteSection }
                         canShowNoteSection=${ deckManager.canShowNoteSection }
                         onRefsChanged=${ deckManager.onRefsChanged }
                         onUpdateDeck=${ deckManager.update } />
        <${SectionBackRefs} deck=${ deck } />
        <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
        <${SectionGraph} depth=${ 2 } deck=${ deck }/>
    </article>`;
}

function IdeaTopMatter({ title, deck, isShowingUpdateForm, isEditingDeckRefs, onRefsToggle, onFormToggle }) {

    if (!deck) {
        return html`<div></div>`;
    }

    return html`
    <div>
        <div class="left-margin">
            <${LeftMarginHeading}>
                ${renderInsignia(deck.insignia)}
            </${LeftMarginHeading}>
            <${LeftMarginHeading}>
                ${ formattedDate(deck.createdAt)}
            </${LeftMarginHeading}>
        </div>
        <${Title} title=${ title } isShowingUpdateForm=${isShowingUpdateForm} isEditingDeckRefs=${isEditingDeckRefs} onRefsToggle=${ onRefsToggle } onFormToggle=${ onFormToggle }/>
    </div>`;
}


function SectionUpdateIdea({ idea, onUpdate }) {
    const [title, setTitle] = useState(idea.title || '');
    const [graphTerminator, setGraphTerminator] = useState(idea.graphTerminator);
    const [insigniaId, setInsigniaId] = useState(idea.insignia || 0);

    useEffect(() => {
        if (idea.title && idea.title !== '' && title === '') {
            setTitle(idea.title);
        }
        if (idea.graphTerminator !== undefined) {
            setGraphTerminator(idea.graphTerminator);
        }

        if (idea.insignia !== undefined) {
            setInsigniaId(idea.insignia);
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
            graphTerminator: graphTerminator,
            insignia: insigniaId
        };

        Net.put(`/api/ideas/${idea.id}`, data).then(newDeck => {
            onUpdate(newDeck);
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

        <${InsigniaSelector} insigniaId=${insigniaId} onChange=${setInsigniaId}/>

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
