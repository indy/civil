import { html, route, Link, useState, useEffect } from '/js/ext/library.js';

import Net from '/js/lib/Net.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import { addChronologicalSortYear } from '/js/lib/eras.js';
import QuickFind from '/js/components/QuickFind.js';
import RollableSection from '/js/components/RollableSection.js';
import ListingLink from '/js/components/ListingLink.js';
import PointForm from '/js/components/PointForm.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import { svgPointAdd,
         svgCancel,
         svgCaretRight,
         svgCaretDown,
         svgBlank,
         svgTickedCheckBox,
         svgUntickedCheckBox } from '/js/lib/svgIcons.js';

function hackMakeCompatibleWithNoteManager(p) {
  p.point_id = p.id;
  p.point_title = p.title;
  return p;
}
// called once after the timeline has been fetched from the server
function afterLoaded(timeline) {
  if (timeline.points) {
    timeline.points = timeline.points
      .map(addChronologicalSortYear)
      .map(hackMakeCompatibleWithNoteManager)
      .sort((a, b) => a.sort_year > b.sort_year);
  }

  return timeline;
}

function Timeline(props) {
  const [state, dispatch] = useStateValue();

  const timelineId = parseInt(props.id, 10);
  const timeline = state.cache.deck[timelineId] || { id: timelineId };

  const deckManager = DeckManager({
    deck: timeline,
    title: timeline.title,
    resource: "timelines",
    afterLoadedFn: afterLoaded,
    updateForm: html`<${UpdateTimelineForm} timeline=${timeline} />`
  });

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = !!(deckManager.hasNotes || (timeline.linkbacks_to_decks && timeline.linkbacks_to_decks.length > 0));

  console.log(timeline);
  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons }
      ${ deckManager.updateForm }

      ${ deckManager.noteManager() }

      <${SectionLinkBack} linkbacks=${ timeline.linkbacks_to_decks }/>
      <${ListPoints} points=${ timeline.points }
                     deckManager=${ deckManager }
                     holderId=${ timeline.id }
                     holderName=${ timeline.title }/>
      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${timelineId} depth=${2}/>
    </article>`;
}

function Timelines() {
  const [state, dispatch] = useStateValue();

  useEffect(() => {
    async function fetcher() {
      const timelines = await Net.get('/api/timelines');
      dispatch({
        type: 'setTimelines',
        timelines
      });
    }
    if(!state.timelinesLoaded) {
      fetcher();
    }
  }, []);

  function saveNewTimeline({title}) {
    const data = {
      title: title
    };
    const resource = "timelines";

    // create a new resource named 'searchTerm'
    Net.post(`/api/${resource}`, data).then(timeline => {
      Net.get(`/api/${resource}`).then(timelines => {
        dispatch({
          type: 'setTimelines',
          timelines
        });
        dispatch({
          type: 'addAutocompleteDeck',
          id: timeline.id,
          name: timeline.title,
          resource: resource
        });
      });
      route(`/${resource}/${timeline.id}`);
    });
  }

  function createTimelineListing(timeline) {
    return html`<${ListingLink} id=${ timeline.id } name=${ timeline.title } resource='timelines'/>`;
  }
  const tl = state.timelines.map(createTimelineListing);

  return html`
    <div>
      <h1>Timelines</h1>
      <${QuickFind} autocompletes=${state.ac.decks} resource='timelines' save=${saveNewTimeline}/>
      <div>
        <ul class="timelines-list">
          ${ tl }
        </ul>
      </div>
    </div>`;
}

function UpdateTimelineForm({ timeline }) {
  timeline = timeline || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    title: timeline.title || ''
  });

  if (timeline.title && timeline.title !== '' && localState.title === '') {
    setLocalState({
      ...localState,
      title: timeline.title
    });
  }

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
    });

    e.preventDefault();
  };

  return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <label for="title">Title:</label>
      <br/>
      <input id="title"
             type="text"
             name="title"
             value=${ localState.title }
             autoComplete="off"
             onInput=${ handleChangeEvent } />
      <br/>
      <input type="submit" value="Update Timeline"/>
    </form>`;
}

function DeckPoint({ deckPoint, noteManager, holderId }) {
  let [expanded, setExpanded] = useState(false);

  function onClicked(e) {
    e.preventDefault();
    setExpanded(!expanded);
  }

  let item = html`<li class='relevent-deckpoint'>
                    <span onClick=${onClicked}>${ expanded ? svgCaretDown() : svgCaretRight() }</span>
                    ${ deckPoint.title } ${ deckPoint.date_textual }
                    ${ expanded && html`<div class="point-notes">
                                          ${ noteManager(deckPoint) }
                                        </div>`}
                  </li>`;
  return item;
}

function ListPoints({ points, deckManager, holderId, holderName }) {
  const [showPointForm, setShowPointForm] = useState(false);

  function onAddPointClicked(e) {
    e.preventDefault();
    setShowPointForm(!showPointForm);
  }

  // called by DeckManager once a point has been successfully created
  function onPointCreated() {
    setShowPointForm(false);
  }

  let arr = points || [];
  let dps = arr.map(dp => html`<${DeckPoint}
                                 key=${ dp.point_id}
                                 noteManager=${ deckManager.noteManager }
                                 holderId=${ holderId }
                                 deckPoint=${ dp }/>`);

  let formSidebarText = showPointForm ? "Hide Form" : `Add Point for ${ holderName }`;

  return html`
    <${RollableSection} heading='Timeline'>
      <ul class="deckpoint-list">
        ${ dps }
      </ul>
      <div class="spanne">
        <div class="spanne-entry spanne-clickable" onClick=${ onAddPointClicked }>
          <span class="spanne-icon-label">${ formSidebarText }</span>
          ${ showPointForm ? svgCancel() : svgPointAdd() }
        </div>
      </div>
      ${ showPointForm && deckManager.buildPointForm(onPointCreated) }
    </${RollableSection}>`;
}

export { Timeline, Timelines };
