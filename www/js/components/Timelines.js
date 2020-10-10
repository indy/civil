import { html, route, Link, useState, useEffect } from '/js/ext/library.js';

import { useStateValue } from '/js/lib/StateProvider.js';
import Net from '/js/lib/Net.js';
import { addChronologicalSortYear, era, filterBefore, filterAfter, filterBetween, yearFrom } from '/js/lib/eras.js';

import QuickFind from '/js/components/QuickFind.js';
import PointForm from '/js/components/PointForm.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';

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

  function createTimelineListingAD(ev) {
    return buildTimelineListing(ev.id, yearText(ev.sort_date, "AD"), ev.title);
  }

  function createTimelineListing(ev) {
    return buildTimelineListing(ev.id, yearText(ev.sort_date, ""), ev.title);
  }

  function buildTimelineListing(id, dateText, title) {
        const href = `/timelines/${id}`;

    return html`
    <li key=${ id }>
      <${Link} href=${ href }>
        <span class="event-date">${ dateText }</span> ${ title }
      </${Link}>
    </li>`;
  }

  function yearText(dateString, adPostfix) {
    const year = yearFrom(dateString);

    if (year < 0) {
      return `${year * -1} BC`;
    } else {
      return `${year} ${adPostfix}`;
    }
  }

  function timelinesList(list, heading) {
        return html`
    <div>
      ${ !!list.length && html`<h2>${ heading }</h2>` }
      <ul class="timelines-list">
        ${ list }
      </ul>
    </div>`;
  }

  function saveNewTimeline({title, idea_category}) {
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


  const uncategorisedTimelinesList = filterAfter(state.timelines, era.uncategorisedYear).map(createTimelineListing);
  const ancientTimelinesList = filterBefore(state.timelines, era.ancientCutoff).map(createTimelineListingAD);
  const medievalTimelinesList = filterBetween(state.timelines, era.ancientCutoff, era.medievalCutoff).map(createTimelineListing);
  const modernTimelinesList = filterBetween(state.timelines, era.medievalCutoff, era.modernCutoff).map(createTimelineListing);
  const contemporaryTimelinesList = filterBetween(state.timelines, era.modernCutoff, era.uncategorisedYear).map(createTimelineListing);

  return html`
    <div>
      <h1>Timelines</h1>
      <${QuickFind} autocompletes=${state.ac.decks} resource='timelines' save=${saveNewTimeline} />
      ${ timelinesList(uncategorisedTimelinesList, "Uncategorised")}
      ${ timelinesList(ancientTimelinesList, "Ancient")}
      ${ timelinesList(medievalTimelinesList, "Medieval")}
      ${ timelinesList(modernTimelinesList, "Modern")}
      ${ timelinesList(contemporaryTimelinesList, "Contemporary")}
    </div>`;
}

// called once after the timeline has been fetched from the server
function afterLoaded(timeline) {
  if (timeline.points) {
    timeline.points = timeline.points
      .map(addChronologicalSortYear)
      .sort((a, b) => a.sort_year > b.sort_year);
  }
  return timeline;
}

function Timeline(props) {
  const [state, dispatch] = useStateValue();
  const [showPrimeForm, setShowPrimeForm] = useState(false);

  const timelineId = parseInt(props.id, 10);
  const timeline = state.cache.deck[timelineId] || { id: timelineId };

  const deckManager = DeckManager({
    deck: timeline,
    title: timeline.title,
    resource: "timelines",
    afterLoadedFn: afterLoaded,
    updateForm: html`<${UpdateTimelineForm} timeline=${ timeline } />`
  });

  function onShowPrimeForm() {
    setShowPrimeForm(!showPrimeForm);
  }

  function showAddPrimePointMessage() {
    return html`<p class="fakelink" onClick=${ onShowPrimeForm }>
                  You should add a point for this timeline
                </p>`;
  }

  function onAddPrimePoint(point) {
    Net.post(`/api/timelines/${timelineId}/points`, point).then(timeline => {
      setShowPrimeForm(false);
      dispatch({
        type: 'setTimeline',
        id: timeline.id,
        newItem: timeline
      });

      // also update the people list now that this person is no longer uncategorised
      Net.get('/api/timelines').then(timelines => {
        dispatch({
          type: 'setTimelines',
          timelines
        });
      });
    });
  }

  function primeForm() {
    let point = {
      title: 'Prime'
    };
    return html`<${PointForm} pointKind="point_prime" point=${ point } onSubmit=${ onAddPrimePoint } submitMessage="Create Point"/>`;
  }

  function showPoints(points) {

    return points.map(p => html`<${Point} key=${ p.id} point=${ p } parentResource="timelines"/>`);
  }

  function hasNoPrimePoint(timeline) {
    function hasPrimePoint(point) {
      return point.title === "Prime";
    }

    if (timeline.points) {
      return !timeline.points.find(hasPrimePoint);
    };
    return false;
  }


  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons }
      ${ deckManager.pointForm }
      ${ deckManager.updateForm }
      ${ hasNoPrimePoint(timeline) && showAddPrimePointMessage() }
      ${ showPrimeForm && primeForm() }
      ${ timeline.points && showPoints(timeline.points) }
      ${ deckManager.noteManager() }
      <${SectionLinkBack} linkbacks=${ timeline.linkbacks_to_decks }/>
    </article>`;
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

function Point({ point, parentResource }) {
  const [showForm, setShowForm] = useState(false);

  function onShowForm() {
    setShowForm(!showForm);
  }

  function buildShowForm() {
    function handlePointFormSubmit(p) {
      console.log(p);
    }

    return html`<${PointForm}
                  point=${ point }
                  onSubmit=${ handlePointFormSubmit }
                  submitMessage="Update Point">
                 </${PointForm}>`;
  }

  let dom;
  const date = point.date_textual;
  const location = point.location_textual;

  if (parentResource === "timelines" && point.title === "Prime") {
    dom = html`<p class="subtitle">${ date } ${ location }</p>`;
  } else {
    let text;
    if (location && location.length > 0) {
      if (point.title === "Born" || point.title === "Died") {
        text = `${date} ${point.title} in ${location}`;
      } else {
        // choosing not to display location, even though one is available
        // might change this later, or even use location to show a map
        text = `${date} ${point.title}`;
      }
    } else {
        text = `${date} ${point.title}`;
    }

    dom = html`<p class="subtitle">-${ text }</p>`;
  }

  return html`
    <div onClick=${ onShowForm }>
      ${ dom }
      ${ showForm && buildShowForm() }
    </div>`;
}

export { Timelines, Timeline };
