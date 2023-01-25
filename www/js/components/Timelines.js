import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { getAppState, AppStateChange } from '/js/AppState.js';
import { capitalise } from '/js/JsUtils.js';
import { ensureListingLoaded, fetchDeckListing, deckTitle } from '/js/CivilUtils.js';

import CivilInput from '/js/components/CivilInput.js';
import DeckManager from '/js/components/DeckManager.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import { renderInsignia, InsigniaSelector } from '/js/components/Insignias.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionGraph from '/js/components/SectionGraph.js';
import SectionNotes from '/js/components/SectionNotes.js';
import TopMatter from '/js/components/TopMatter.js';
import WhenVerbose from '/js/components/WhenVerbose.js';
import { DeckSimpleList } from '/js/components/ListSections.js';
import { DeluxeToolbar, TOOLBAR_VIEW } from '/js/components/DeluxeToolbar.js';
import { PointForm } from '/js/components/PointForm.js';
import { svgPointAdd, svgX, svgCaretRight, svgCaretRightEmpty, svgCaretDown } from '/js/svgIcons.js';

function Timelines() {
    const appState = getAppState();
    const resource = 'timelines';

    ensureListingLoaded(resource);

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>
        <${DeckSimpleList} list=${appState.listing.value.timelines} />
    </article>`;
}

function Timeline({ id }) {
    const appState = getAppState();

    const timelineId = parseInt(id, 10);
    const resource = 'timelines';

    const deckManager = DeckManager({
        id: timelineId,
        resource,
        hasSummarySection: true,
        hasReviewSection: false
    });

    let deck = deckManager.getDeck();

    return html`
    <article>
        <${DeluxeToolbar}/>

        <${TopMatter} title=${ deckTitle(deck) }
                      deck=${deck}
                      isShowingUpdateForm=${ deckManager.isShowingUpdateForm() }
                      isEditingDeckRefs=${ deckManager.isEditingDeckRefs() }
                      onRefsToggle=${ deckManager.onRefsToggle }
                      onFormToggle=${ deckManager.onFormToggle }>
        </${TopMatter}>

        ${ deckManager.isShowingUpdateForm() && html`
            <${DeleteDeckConfirmation} resource='timelines' id=${timelineId}/>
            <${SectionUpdateTimeline} timeline=${ deck } onUpdate=${ deckManager.updateAndReset }/>
        `}

        <${SectionDeckRefs} deck=${ deck } isEditing=${ deckManager.isEditingDeckRefs()} onRefsChanged=${ deckManager.onRefsChanged } onRefsToggle=${ deckManager.onRefsToggle }/>
        <${SectionNotes} deck=${ deck }
                         title=${ deckTitle(deck) }
                         onRefsChanged=${ deckManager.onRefsChanged }
                         resource="timelines"
                         howToShowNoteSection=${ deckManager.howToShowNoteSection }
                         canShowNoteSection=${ deckManager.canShowNoteSection }
                         onUpdateDeck=${ deckManager.update }/>
        <${SectionBackRefs} deck=${ deck } />
        ${ !!deck && html`<${ListPoints} points=${ deck.points }
                                         deckManager=${ deckManager }
                                         showAddPointForm=${ appState.showAddPointForm.value }
                                         holderId=${ deck.id }
                                         holderName=${ deck.title }/>`}

        <${SectionGraph} depth=${ 2 } deck=${ deck }/>
    </article>`;
}

function SectionUpdateTimeline({ timeline, onUpdate }) {
    const [localState, setLocalState] = useState({
        title: timeline.title || '',
        insigniaId: timeline.insignia || 0
    });

    useEffect(() => {
        if (timeline.title && timeline.title !== '' && localState.title === '') {
            setLocalState({
                ...localState,
                title: timeline.title
            });
        }
        if (timeline.insignia) {
            setLocalState({
                ...localState,
                insigniaId: timeline.insignia
            });
        }

    }, [timeline]);

    const handleChangeEvent = (e) => {
        const target = e.target;
        const name = target.name;
        const value = target.value;

        if (name === "title") {
            setLocalState({
                ...localState,
                title: value
            });
        }
    };

    const handleSubmit = (e) => {
        const data = {
            title: localState.title.trim(),
            insignia: localState.insigniaId
        };

        // edit an existing timeline
        Net.put(`/api/timelines/${timeline.id}`, data).then(newDeck => {
            onUpdate(newDeck);
        });

        e.preventDefault();
    };

    const setInsigniaId = (id) => {
        setLocalState({
            ...localState,
            insigniaId: id
        });
    }

    return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
        <label for="title">Title:</label>
        <br/>
        <${CivilInput} id="title"
                       value=${ localState.title }
                       onInput=${ handleChangeEvent } />
        <br/>

        <${InsigniaSelector} insigniaId=${localState.insigniaId} onChange=${setInsigniaId}/>
        <br/>

        <input type="submit" value="Update Timeline"/>
    </form>`;
}

function TimelineDeckPoint({ deckPoint, hasNotes, noteManager, holderId }) {
    let [expanded, setExpanded] = useState(false);

    function onClicked(e) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    return html`
    <li class='relevent-deckpoint'>
        <span onClick=${onClicked}>${ expanded ? svgCaretDown() : hasNotes ? svgCaretRight() : svgCaretRightEmpty() }</span>
        ${ deckPoint.title } ${ deckPoint.dateTextual }
        ${ expanded && html`
            <div class="point-notes">
                ${ noteManager }
            </div>`}
    </li>`;
}

function ListPoints({ points, deckManager, holderId, holderName, showAddPointForm }) {
    function onAddPointClicked(e) {
        e.preventDefault();
        showAddPointForm ? AppStateChange.hideAddPointForm() : AppStateChange.showAddPointForm();
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        AppStateChange.hideAddPointForm();
    }

    let arr = points || [];
    let dps = arr.map(dp => html`
    <${TimelineDeckPoint} key=${ dp.id}
                          noteManager=${ deckManager.noteManagerForDeckPoint(dp) }
                          hasNotes=${ deckManager.pointHasNotes(dp) }
                          holderId=${ holderId }
                          deckPoint=${ dp }/>`);

    let formSidebarText = showAddPointForm ? "Hide Form" : `Add Point for ${ holderName }`;

    return html`
    <${RollableSection} heading='Timeline'>
        <ul class="unstyled-list hug-left">
            ${ dps }
        </ul>
        <${WhenVerbose}>
            <div class="left-margin">
                <div class="left-margin-entry fadeable clickable" onClick=${ onAddPointClicked }>
                    <span class="left-margin-icon-label">${ formSidebarText }</span>
                    ${ showAddPointForm ? svgX() : svgPointAdd() }
                </div>
            </div>
        </${WhenVerbose}>
        ${ showAddPointForm && deckManager.buildPointForm(onPointCreated) }
    </${RollableSection}>`;
}

export { Timeline, Timelines };
