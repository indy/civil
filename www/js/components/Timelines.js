import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded } from '/js/CivilUtils.js';
import Net from '/js/Net.js';
import { addChronologicalSortYear } from '/js/eras.js';
import { capitalise } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import CivilInput from '/js/components/CivilInput.js';
import GraphSection from '/js/components/GraphSection.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import { BasicListSection } from '/js/components/ListSections.js';
import { DeckManager } from '/js/components/DeckManager.js';
import { PointForm } from '/js/components/PointForm.js';
import { WhenVerbose } from '/js/components/WhenVerbose.js';
import { WhenWritable } from '/js/components/WhenWritable.js';
import { svgPointAdd, svgX, svgCaretRight, svgCaretRightEmpty, svgCaretDown } from '/js/svgIcons.js';

function Timelines() {
    const [state, dispatch] = useStateValue();
    const resource = 'timelines';

    ensureListingLoaded(resource);

    return html`
    <article>
      <h1 class="ui">${capitalise(resource)}</h1>
      <${BasicListSection} list=${state.listing.timelines} resource=${resource}/>
    </article>`;
}

function Timeline(props) {
    const [state, dispatch] = useStateValue();

    const timelineId = parseInt(props.id, 10);
    const timeline = state.cache.deck[timelineId] || { id: timelineId };

    const deckManager = DeckManager({
        deck: timeline,
        title: timeline.title,
        resource: "timelines",
        preCacheFn: preCacheFn,
        updateForm: UpdateTimelineForm,
        hasSummarySection: true,
        hasReviewSection: false
    });

    // this is only for presentational purposes
    // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
    // this check prevents the vis from rendering until after we have all the note and links ready
    const okToShowGraph = !!(deckManager.hasNotes || (timeline.backrefs && timeline.backrefs.length > 0));

    return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons() }
      ${ deckManager.buildUpdateForm() }
      ${ deckManager.buildNoteSections() }

      <${SectionBackRefs} state=${state} backrefs=${ timeline.backrefs } backnotes=${ timeline.backnotes } deckId=${ timeline.id }/>

      <${ListPoints} points=${ timeline.points }
                     deckManager=${ deckManager }
                     dispatch=${ dispatch }
                     showAddPointForm=${ state.showAddPointForm }
                     holderId=${ timeline.id }
                     holderName=${ timeline.title }/>

      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${timelineId} depth=${2}/>
    </article>`;
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(timeline) {
    if (timeline.points) {
        timeline.points = timeline.points
            .map(addChronologicalSortYear)
            .sort((a, b) => a.sort_year > b.sort_year);
    }

    return timeline;
}

function UpdateTimelineForm({ deck, hideFormFn }) {
    const timeline = deck || {};
    const [state, dispatch] = useStateValue();

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
        Net.put(`/api/timelines/${timeline.id}`, data).then(newItem => {
            dispatch({
                type: 'cacheDeck',
                id: timeline.id,
                newItem
            });
            // hide this form
            hideFormFn();
        });

        e.preventDefault();
    };

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

    return html`<li class='relevent-deckpoint'>
                <span onClick=${onClicked}>${ expanded ? svgCaretDown() : hasNotes ? svgCaretRight() : svgCaretRightEmpty() }</span>
                ${ deckPoint.title } ${ deckPoint.date_textual }
                ${ expanded && html`<div class="point-notes">
        ${ noteManager }
    </div>`}
              </li>`;
}

function ListPoints({ points, deckManager, holderId, holderName, showAddPointForm, dispatch }) {
    function onAddPointClicked(e) {
        e.preventDefault();
        dispatch({type: showAddPointForm ? "hideAddPointForm" : "showAddPointForm"});
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        dispatch({type: "hideAddPointForm"});
    }

    let arr = points || [];
    let dps = arr.map(dp => html`<${TimelineDeckPoint}
                                 key=${ dp.id}
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

      <${WhenWritable}>
        <${WhenVerbose}>
          <div class="left-margin">
            <div class="left-margin-entry clickable" onClick=${ onAddPointClicked }>
              <span class="left-margin-icon-label">${ formSidebarText }</span>
              ${ showAddPointForm ? svgX() : svgPointAdd() }
            </div>
          </div>
        </${WhenVerbose}>
        ${ showAddPointForm && deckManager.buildPointForm(onPointCreated) }
      </${WhenWritable}>
    </${RollableSection}>`;
}

export { Timeline, Timelines };
