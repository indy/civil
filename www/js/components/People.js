import { html, route, Link, useState, useEffect } from '/js/ext/library.js';

import Net from '/js/lib/Net.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import { era, filterBefore, filterAfter, filterBetween } from '/js/lib/eras.js';

import ListingLink from '/js/components/ListingLink.js';
import PointForm from '/js/components/PointForm.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import Graph from '/js/components/Graph.js';

function Person(props) {
  const [state, dispatch] = useStateValue();
  const [showBirthForm, setShowBirthForm] = useState(false);

  const personId = parseInt(props.id, 10);
  const person = state.cache.deck[personId] || { id: personId };

  const deckManager = DeckManager({
    deck: person,
    title: person.name,
    resource: "people",
    updateForm: html`<${PersonForm} person=${person} editing />`
  });

  function onShowBirthForm() {
    console.log('onShowBirthForm');
    setShowBirthForm(!showBirthForm);
  }

  function showAddBirthPointMessage() {
    console.log('showAddBirthPointMessage');
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
    console.log('hi');
    let point = {
      title: 'Born'
    };
    return html`
      <${PointForm} readOnlyTitle point=${ point }
                    onSubmit=${ onAddBirthPoint }
                    submitMessage="Create Birth Point"/>`;
  }

  function hasNoBirthPoint(person) {
    function hasBirthPoint(point) {
      return point.title === "Born";
    }

    if (person.points) {
      return !person.points.find(hasBirthPoint);
    };
    return false;
  }

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes || person.linkbacks_to_decks;

  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons }
      ${ deckManager.noteForm }
      ${ deckManager.pointForm }
      ${ deckManager.updateForm }

      ${ hasNoBirthPoint(person) && showAddBirthPointMessage() }
      ${ showBirthForm && birthForm() }

      ${ deckManager.notes }
      <${SectionLinkBack} linkbacks=${ person.linkbacks_to_decks }/>
      <${ListDeckPoints} deckPoints=${ person.all_points_during_life }
                         holderId=${ person.id }
                         holderName=${ person.name }/>
      ${ okToShowGraph && html`<${Graph} id=${ personId } depth=${ 2 } />` }
    </article>`;
}

function People() {
  const [state, dispatch] = useStateValue();
  let [showAddPersonForm, setShowAddPersonForm] = useState(false);

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

  const toggleShowAdd = () => {
    setShowAddPersonForm(!showAddPersonForm);
  };

  function peopleList(list, heading) {
    return html`
    <div>
      ${ !!list.length && html`<h2>${ heading }</h2>` }
      <ul class="people-list">
        ${ list }
      </ul>
    </div>`;
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
      <h1 onClick=${ toggleShowAdd }>${ showAddPersonForm ? "Add Person" : "People" }</h1>
      ${ showAddPersonForm && html`<${PersonForm}/>`}
      ${ peopleList(uncategorisedPeopleList, "Uncategorised")}
      ${ peopleList(ancientPeopleList, "Ancient")}
      ${ peopleList(medievalPeopleList, "Medieval")}
      ${ peopleList(modernPeopleList, "Modern")}
      ${ peopleList(contemporaryPeopleList, "Contemporary")}
    </div>`;
}

function PersonForm({ person, editing }) {
  person = person || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    name: person.name || ''
  });

  const [redirectUrl, setRedirectUrl] = useState(false);

  if (person.name && person.name !== '' && localState.name === '') {
    setLocalState({
      ...localState,
      name: person.name
    });
  }

  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
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

    // if (true) {
    //   console.log(data);
    // } else
    if (editing) {
      // edit an existing person
      Net.put(`/api/people/${person.id}`, data).then(newItem => {
        dispatch({
          type: 'cacheDeck',
          id: person.id,
          newItem
        });
      });
    } else {
      // create a new person
      Net.post('/api/people', data).then(person => {
        // get the updated list of people
        Net.get('/api/people').then(people => {
          dispatch({
            type: 'setPeople',
            people
          });
          dispatch({
            type: 'addAutocompleteDeck',
            id: person.id,
            name: person.name,
            resource: "people"
          });
        });
        setRedirectUrl(`people/${person.id}`);
      });
    }


    e.preventDefault();
  };

  if (redirectUrl) {
    route(redirectUrl, true);
  } else {
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
        <input type="submit" value=${ editing ? "Update Person" : "Create Person"}/>
      </form>`;
  }
}

function DeckPoint({ deckPoint, holderId }) {
  let pointTitle = deckPoint.point_title === "Prime" && deckPoint.deck_resource === "events" ? "" : deckPoint.point_title;

  let item;
  if (deckPoint.deck_id === holderId) {
    item = html`<li class='relevent-deckpoint'>
                  ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.point_date_textual }
                </li>`;

  } else {
    item = html`<li class='deckpoint'>
                  <${Link} activeClassName="active" href='/${deckPoint.deck_resource}/${deckPoint.deck_id}' >
                    ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.point_date_textual }
                  </${Link}>
                </li>`;
  }

  return item;
}

function ListDeckPoints({ deckPoints, holderId, holderName }) {
  let [showButtons, setShowButtons] = useState(false);
  let [onlyThisPerson, setOnlyThisPerson] = useState(false);
  let [hideBirthsDeaths, setHideBirthsDeaths] = useState(false);

  function toggleShowButtons() {
    setShowButtons(!showButtons);
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    if (name === "only_this_person") {
      setOnlyThisPerson(value);
    }
    if (name === "hide_birth_deaths") {
      setHideBirthsDeaths(value);
    }
  };

  function buildButtons() {
    return html`
      <div>
        <div class="deckpoint-block">
          <input id="only-this-person"
                 type="checkbox"
                 name="only_this_person"
                 checked=${ onlyThisPerson }
                 onInput=${ handleChangeEvent } />
          <label for="only-this-person">Only This Person</label>
        </div>
        <div class="deckpoint-block">
          <input id="hide-birth-deaths"
                 type="checkbox"
                 name="hide_birth_deaths"
                 checked=${ hideBirthsDeaths }
                 onInput=${ handleChangeEvent } />
          <label for="hide-birth-deaths">Hide Other Birth/Deaths</label>
        </div>
      </div>`;
  }

  let arr = deckPoints || [];
  if (onlyThisPerson) {
    arr = arr.filter(e => e.deck_id === holderId);
  }
  if (hideBirthsDeaths) {
    arr = arr.filter(e => e.deck_id === holderId || !(e.point_title === "Born" || e.point_title === "Died"));
  }
  let dps = arr.map(dp => html`<${DeckPoint} key=${ dp.point_id} holderId=${ holderId } deckPoint=${ dp }/>`);

  return html`
    <section>
      <h2 onClick=${ toggleShowButtons }>Events during the life of ${ holderName }</h2>
      ${ showButtons && buildButtons() }
      <ul>
        ${ dps }
      </ul>
    </section>`;
}

export { Person, People };
