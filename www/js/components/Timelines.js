import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, fetchDeckListing } from '/js/CivilUtils.js';
import Net from '/js/Net.js';
import { addChronologicalSortYear } from '/js/eras.js';
import { capitalise } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import CivilInput from '/js/components/CivilInput.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import SectionGraph from '/js/components/SectionGraph.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionNotes from '/js/components/SectionNotes.js';
import DeckManager from '/js/components/DeckManager.js';
import { DeckSimpleList } from '/js/components/ListSections.js';
import { PointForm } from '/js/components/PointForm.js';
import Title from '/js/components/Title.js';
import WhenVerbose from '/js/components/WhenVerbose.js';
import { svgPointAdd, svgX, svgCaretRight, svgCaretRightEmpty, svgCaretDown } from '/js/svgIcons.js';

function Timelines() {
    const [state, dispatch] = useStateValue();
    const resource = 'timelines';

    ensureListingLoaded(resource);

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>
        <${DeckSimpleList} list=${state.listing.timelines} />
    </article>`;
}

function Timeline({ id }) {
    const [state] = useStateValue();

    const timelineId = parseInt(id, 10);

    const deckManager = DeckManager({
        id: timelineId,
        resource: "timelines",
        preCacheFn: preCacheFn,
        hasSummarySection: true,
        hasReviewSection: false
    });

    let timeline = state.deckManagerState.deck;

    return html`
    <article>
        <${Title} title=${ deckManager.title }/>
        <${SectionUpdateTimeline}/>
        <${DeleteDeckConfirmation} resource='timelines' id=${timelineId}/>
        <${SectionDeckRefs} onRefsChanged=${ deckManager.onRefsChanged }/>
        <${SectionNotes} title=${ deckManager.title } onRefsChanged=${ deckManager.onRefsChanged } preCacheFn=${ preCacheFn } resource="timelines" />
        <${SectionBackRefs} deckId=${ timelineId }/>


        ${ !!timeline && html`<${ListPoints} points=${ timeline.points }
                                             deckManager=${ deckManager }
                                             showAddPointForm=${ state.showAddPointForm }
                                             holderId=${ timeline.id }
                                             holderName=${ timeline.title }/>`}

        <${SectionGraph} depth=${ 2 } />
    </article>`;
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(timeline) {
    // todo: remove this???
    if (timeline.points) {
        timeline.points = timeline.points
            .map(addChronologicalSortYear)
            .sort((a, b) => a.sort_year > b.sort_year);
    }

    return timeline;
}

function SectionUpdateTimeline() {
    const [state, appDispatch] = useStateValue();

    const timeline = state.deckManagerState.deck || {};

    const [localState, setLocalState] = useState({
        title: timeline.title || ''
    });

    useEffect(() => {
        if (timeline.title && timeline.title !== '' && localState.title === '') {
            setLocalState({
                ...localState,
                title: timeline.title
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
            title: localState.title.trim()
        };

        // edit an existing timeline
        Net.put(`/api/timelines/${timeline.id}`, data).then(newDeck => {
            appDispatch({type: 'dms-update-deck', data: { deck: newDeck, resource: 'timelines'}});
            appDispatch({type: 'dms-hide-form'});

            // fetch the listing incase editing the article has changed it's star rating or annotation
            //
            let resource = 'timelines';
            fetchDeckListing(appDispatch, resource, '/api/timelines/listings');
        });

        e.preventDefault();
    };

    if (!state.deckManagerState.showUpdateForm) {
        return html`<div></div>`;
    }

    return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
        <label for="title">Title:</label>
        <br/>
        <${CivilInput} id="title"
                       value=${ localState.title }
                       autoComplete="off"
                       onInput=${ handleChangeEvent } />
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
        ${ deckPoint.title } ${ deckPoint.date_textual }
        ${ expanded && html`
            <div class="point-notes">
                ${ noteManager }
            </div>`}
    </li>`;
}

function ListPoints({ points, deckManager, holderId, holderName, showAddPointForm }) {
    const [state, dispatch] = useStateValue();

    function onAddPointClicked(e) {
        e.preventDefault();
        dispatch({type: showAddPointForm ? "hideAddPointForm" : "showAddPointForm"});
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        dispatch({type: "hideAddPointForm"});
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
                <div class="left-margin-entry clickable" onClick=${ onAddPointClicked }>
                    <span class="left-margin-icon-label">${ formSidebarText }</span>
                    ${ showAddPointForm ? svgX() : svgPointAdd() }
                </div>
            </div>
        </${WhenVerbose}>
        ${ showAddPointForm && deckManager.buildPointForm(onPointCreated) }
    </${RollableSection}>`;
}

export { Timeline, Timelines };
