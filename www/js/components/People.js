import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { addChronologicalSortYear,
         calcAgeInYears,
         dateStringAsTriple,
         era,
         filterBefore,
         filterAfter,
         filterBetween } from '/js/eras.js';
import QuickFind from '/js/components/QuickFind.js';
import RollableSection from '/js/components/RollableSection.js';
import ListingLink from '/js/components/ListingLink.js';
import PointForm from '/js/components/PointForm.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import { svgPointAdd,
         svgCancel,
         svgCaretDown,
         svgCaretRight,
         svgBlank,
         svgTickedCheckBox,
         svgUntickedCheckBox } from '/js/svgIcons.js';


// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person) {
  if (person.points) {
    person.points = person.points
      .map(addChronologicalSortYear)
      .sort((a, b) => a.sort_year > b.sort_year);
  }

  function getExactDateFromPoints(points, kind) {
    const p = points.find(p => p.kind === kind);
    if (!p || !p.exact_date) {
      return null;
    }

    let triple = dateStringAsTriple(p.exact_date);
    return triple;
  }

  // point is an element in all_points_during_life
  function addAge(point, born) {
    if (!point.date) {
      console.log("no date???");
      return point;
    }

    let eventTriple = dateStringAsTriple(point.date);
    let years = calcAgeInYears(eventTriple, born);

    point.age = years;

    return point;
  }

  let born = getExactDateFromPoints(person.points, "PointBegin");
  if (born) {
    // we have a birth year so we can add the age of the person to each of the all_points_during_life elements
    person.all_points_during_life.forEach(p => addAge(p, born));
  }

  return person;
}

function Person(props) {
  const [state, dispatch] = useStateValue();
  const [showBirthForm, setShowBirthForm] = useState(false);

  const personId = parseInt(props.id, 10);
  const person = state.cache.deck[personId] || { id: personId };

  const deckManager = DeckManager({
    deck: person,
    title: person.name,
    resource: "people",
    preCacheFn: preCacheFn,
    updateForm: html`<${UpdatePersonForm} person=${person} />`
  });

  function onShowBirthForm() {
    setShowBirthForm(!showBirthForm);
  }

  function showAddBirthPointMessage() {
    return html`<p class="fakelink" onClick=${ onShowBirthForm }>
                  You should add a birth point for this person
                </p>`;
  }

  function onAddBirthPoint(point) {
    // post to /api/people/{id}/points
    Net.post(`/api/people/${personId}/points`, point).then(person => {
      setShowBirthForm(false);
      dispatch({
        type: 'setPerson',
        id: person.id,
        newItem: person
      });

      // also update the people list now that this person is no longer uncategorised
      Net.get('/api/people').then(people => {
        dispatch({
          type: 'setPeople',
          people
        });
      });
    });
  }

  function birthForm() {
    let point = {
      title: 'Born'
    };
    return html`
      <${PointForm} pointKind="point_begin"
                    point=${ point }
                    onSubmit=${ onAddBirthPoint }
                    submitMessage="Create Birth Point"/>`;
  }

  function hasBirthPoint(person) {
    function hasBirth(point) {
      return point.title === "Born";
    }

    if (person.points) {
      return person.points.find(hasBirth);
    };
    return false;
  }

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = !!(deckManager.hasNotes || (person.linkbacks_to_decks && person.linkbacks_to_decks.length > 0));
  const hasBirth = hasBirthPoint(person);

  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons }
      ${ deckManager.updateForm }

      ${ !hasBirth && showAddBirthPointMessage() }
      ${ showBirthForm && birthForm() }

      ${ deckManager.noteManager() }

      <${SectionLinkBack} linkbacks=${ person.linkbacks_to_decks }/>
      ${ hasBirth && html`<${ListDeckPoints} deckPoints=${ person.all_points_during_life }
                                             deckManager=${ deckManager }
                                             dispatch=${ dispatch }
                                             holderId=${ person.id }
                                             holderName=${ person.name }/>`}
      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${personId} depth=${2}/>
    </article>`;
}

function People() {
  const [state, dispatch] = useStateValue();

  useEffect(() => {
    async function fetcher() {
      const people = await Net.get('/api/people');
      dispatch({
        type: 'setPeople',
        people
      });
    }
    if(!state.peopleLoaded) {
      fetcher();
    }
  }, []);

  function peopleList(list, heading) {
    return html`
    <div>
      ${ !!list.length && html`<h2>${ heading }</h2>` }
      <ul class="people-list">
        ${ list }
      </ul>
    </div>`;
  }

  function saveNewPerson({title}) {
    const data = {
      name: title
    };
    const resource = "people";

    // create a new resource named 'searchTerm'
    Net.post(`/api/${resource}`, data).then(person => {
      Net.get(`/api/${resource}`).then(people => {
        dispatch({
          type: 'setPeople',
          people
        });
        dispatch({
          type: 'addAutocompleteDeck',
          id: person.id,
          name: person.title,
          resource: resource
        });
      });
      route(`/${resource}/${person.id}`);
    });
  }

  function createPersonListing(person) {
    return html`<${ListingLink} id=${ person.id } name=${ person.name } resource='people'/>`;
  }

  const uncategorisedPeopleList = filterAfter(state.people, era.uncategorisedYear).map(createPersonListing);
  const ancientPeopleList = filterBefore(state.people, era.ancientCutoff).map(createPersonListing);
  const medievalPeopleList = filterBetween(state.people, era.ancientCutoff, era.medievalCutoff).map(createPersonListing);
  const modernPeopleList = filterBetween(state.people, era.medievalCutoff, era.modernCutoff).map(createPersonListing);
  const contemporaryPeopleList = filterBetween(state.people, era.modernCutoff, era.uncategorisedYear).map(createPersonListing);

  return html`
    <div>
      <h1>People</h1>
      <${QuickFind} autocompletes=${state.ac.decks} resource='people' save=${saveNewPerson}/>
      ${ peopleList(uncategorisedPeopleList, "Uncategorised")}
      ${ peopleList(ancientPeopleList, "Ancient")}
      ${ peopleList(medievalPeopleList, "Medieval")}
      ${ peopleList(modernPeopleList, "Modern")}
      ${ peopleList(contemporaryPeopleList, "Contemporary")}
    </div>`;
}

function UpdatePersonForm({ person }) {
  person = person || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    name: person.name || ''
  });

  if (person.name && person.name !== '' && localState.name === '') {
    setLocalState({
      ...localState,
      name: person.name
    });
  }

  const handleChangeEvent = (e) => {
    const target = e.target;
    const name = target.name;
    const value = target.value;

    if (name === "name") {
      setLocalState({
        ...localState,
        name: value
      });
    }
  };

  const handleSubmit = (e) => {
    const data = {
      name: localState.name.trim()
    };

    // edit an existing person
    Net.put(`/api/people/${person.id}`, data).then(newItem => {
      dispatch({
        type: 'cacheDeck',
        id: person.id,
        newItem
      });
    });

    e.preventDefault();
  };

  return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <label for="name">Name:</label>
      <br/>
      <input id="name"
             type="text"
             name="name"
             value=${ localState.name }
             autoComplete="off"
             onInput=${ handleChangeEvent } />
      <br/>
      <input type="submit" value="Update Person"/>
    </form>`;
}

/*
    if (expanded) {
      item = html`<li class='relevent-deckpoint'>
                  <span class="deckpoint-age">${ ageText }</span>
                  <span onClick=${onClicked}>${ svgCaretDown() }</span>
                  ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.point_date_textual }
                  <div class="point-notes">
                    ${ noteFn(deckPoint.point_id) }
                  </div>
                </li>`;
    } else {
      item = html`<li class='relevent-deckpoint'>
                  <span class="deckpoint-age">${ ageText }</span>
                  <span onClick=${onClicked}>${ svgCaretUp() }</span>
                  ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.point_date_textual }
                </li>`;
    }
*/
function DeckPoint({ deckPoint, noteManager, holderId }) {
  let [expanded, setExpanded] = useState(false);

  function onClicked(e) {
    e.preventDefault();
    setExpanded(!expanded);
  }

  let pointTitle = deckPoint.title;

  let item;
  let ageText = deckPoint.age > 0 ? `${deckPoint.age}` : "";

  if (deckPoint.deck_id === holderId) {
    item = html`<li class='relevent-deckpoint'>
                  <span class="deckpoint-age">${ ageText }</span>
                  <span onClick=${onClicked}>${ expanded ? svgCaretDown() : svgCaretRight() }</span>
                  ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.date_textual }
                  ${ expanded && html`<div class="point-notes">
                                        ${ noteManager(deckPoint) }
                                      </div>`}
                </li>`;
  } else {
    item = html`<li class='deckpoint'>
                  <${Link} href='/${deckPoint.deck_resource}/${deckPoint.deck_id}' >
                    <span class="deckpoint-age">${ ageText }</span>
                    ${ svgBlank() }
                    ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.date_textual }
                  </${Link}>
                </li>`;
  }

  return item;
}

function ListDeckPoints({ deckPoints, deckManager, holderId, holderName, dispatch }) {
  const [onlyThisPerson, setOnlyThisPerson] = useState(false);
  const [showBirthsDeaths, setShowBirthsDeaths] = useState(false);
  const [showPointForm, setShowPointForm] = useState(false);
  const [showDeathForm, setShowDeathForm] = useState(false);

  function onOnlyThisPersonClicked(e) {
    e.preventDefault();
    setOnlyThisPerson(!onlyThisPerson);
  }
  function onShowOtherClicked(e) {
    e.preventDefault();
    setShowBirthsDeaths(!showBirthsDeaths);
  }
  function onAddPointClicked(e) {
    e.preventDefault();
    setShowPointForm(!showPointForm);
  }
  function onShowDeathFormClicked(e) {
    e.preventDefault();
    setShowDeathForm(!showDeathForm);
  }

  // called by DeckManager once a point has been successfully created
  function onPointCreated() {
    setShowPointForm(false);
  }

  function onAddDeathPoint(point) {
    Net.post(`/api/people/${holderId}/points`, point).then(person => {
      setShowDeathForm(false);
      dispatch({
        type: 'setPerson',
        id: person.id,
        newItem: person
      });

      // also update the people list now that this person is no longer uncategorised
      Net.get('/api/people').then(people => {
        dispatch({
          type: 'setPeople',
          people
        });
      });
    });
  }

  function deathForm() {
    let point = {
      title: 'Died'
    };
    return html`
      <${PointForm} pointKind="point_end"
                    point=${ point }
                    onSubmit=${ onAddDeathPoint }
                    submitMessage="Create Death Point"/>`;
  }


  let arr = deckPoints || [];
  if (onlyThisPerson) {
    arr = arr.filter(e => e.deck_id === holderId);
  }
  if (!showBirthsDeaths) {
    arr = arr.filter(e => e.deck_id === holderId || !(e.title === "Born" || e.title === "Died"));
  }
  const dps = arr.map(dp => html`<${DeckPoint}
                                 key=${ dp.id}
                                 noteManager=${ deckManager.noteManager }
                                 holderId=${ holderId }
                                 deckPoint=${ dp }/>`);

  const formSidebarText = showPointForm ? "Hide Form" : `Add Point for ${ holderName }`;
  const hasDied = deckPoints.some(dp => dp.deck_id === holderId && dp.kind === 'PointEnd');

  return html`
    <${RollableSection} heading='Points during the life of ${ holderName }'>
      <div class="spanne">
        ${ !hasDied && html`<div class="spanne-entry spanne-clickable" onClick=${ onShowDeathFormClicked }>
                              <span class="spanne-icon-label">Add Died Point</span>
                              ${ svgPointAdd() }
                            </div>`}
        <div class="spanne-entry spanne-clickable" onClick=${ onOnlyThisPersonClicked }>
          <span class="spanne-icon-label">Only ${ holderName }</span>
          ${ onlyThisPerson ? svgTickedCheckBox() : svgUntickedCheckBox() }
        </div>
        ${ !onlyThisPerson && html`<div class="spanne-entry spanne-clickable" onClick=${ onShowOtherClicked }>
                                     <span class="spanne-icon-label">Show Other Birth/Deaths</span>
                                     ${ showBirthsDeaths ? svgTickedCheckBox() : svgUntickedCheckBox() }
                                   </div>`}
      </div>

      ${ showDeathForm && deathForm() }
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

export { Person, People };
