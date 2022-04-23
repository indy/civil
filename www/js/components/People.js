import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, fetchDeckListing } from '/js/CivilUtils.js';
import { capitalise } from '/js/JsUtils.js';
import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { addChronologicalSortYear,
         calcAgeInYears,
         dateStringAsTriple,
         era,
         filterBefore,
         filterAfter,
         filterBetween } from '/js/eras.js';
import { svgPointAdd,
         svgX,
         svgCaretDown,
         svgCaretRight,
         svgCaretRightEmpty,
         svgBlank,
         svgTickedCheckBox,
         svgUntickedCheckBox } from '/js/svgIcons.js';

import CivilInput from '/js/components/CivilInput.js';
import GraphSection from '/js/components/GraphSection.js';
import LifespanForm from '/js/components/LifespanForm.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import { CompactedListSection } from '/js/components/ListSections.js';
import { DeckManager } from '/js/components/DeckManager.js';
import { PointForm } from '/js/components/PointForm.js';
import { WhenVerbose } from '/js/components/WhenVerbose.js';
import { WhenWritable } from '/js/components/WhenWritable.js';

function People() {
    const [state, dispatch] = useStateValue();
    const resource = 'people';

    ensureListingLoaded(resource);

    const people = state.listing.people || [];

    const uncategorised = filterAfter(people, era.uncategorisedYear);
    const ancient = filterBefore(people, era.ancientCutoff);
    const medieval = filterBetween(people, era.ancientCutoff, era.medievalCutoff);
    const modern = filterBetween(people, era.medievalCutoff, era.modernCutoff);
    const contemporary = filterBetween(people, era.modernCutoff, era.uncategorisedYear);

    return html`
    <article>
      <h1 class="ui">${capitalise(resource)}</h1>
      <${CompactedListSection} label='Uncategorised' list=${uncategorised} resource=${resource} expanded hideEmpty/>
      <${CompactedListSection} label='Ancient' list=${ancient} resource=${resource} expanded/>
      <${CompactedListSection} label='Medieval' list=${medieval} resource=${resource} expanded/>
      <${CompactedListSection} label='Modern' list=${modern} resource=${resource} expanded/>
      <${CompactedListSection} label='Contemporary' list=${contemporary} resource=${resource} expanded/>
    </article>`;
}

function Person(props) {
    const [state, dispatch] = useStateValue();

    const [searchResults, setSearchResults] = useState([]); // an array of backrefs

    const personId = parseInt(props.id, 10);
    const person = state.cache.deck[personId] || { id: personId };

    const deckManager = DeckManager({
        deck: person,
        title: person.name,
        resource: "people",
        preCacheFn: preCacheFn,
        updateForm: UpdatePersonForm,
        hasSummarySection: true,
        hasReviewSection: false
    });

    useEffect(() => {
        if (person.name) {
            Net.get(`/api/people/${person.id}/additional_search`).then(search_results => {
                setSearchResults(search_results.results);
            });
        }
    }, [person]);

    function dispatchUpdatedPerson(person) {
        dispatch({
            type: 'setPerson',
            id: person.id,
            newItem: preCacheFn(person)
        });

        // also update the people list now that this person is no longer uncategorised
        fetchDeckListing(dispatch, 'people');
    }

    function onLifespan(birthPoint, deathPoint) {
        Net.post(`/api/people/${personId}/points`, birthPoint).then(person => {
            if (deathPoint) {
                Net.post(`/api/people/${personId}/points`, deathPoint).then(person => {
                    dispatchUpdatedPerson(person);
                });
            } else {
                dispatchUpdatedPerson(person);
            }
        });
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
    const okToShowGraph = !!(deckManager.hasNotes || (person.backrefs && person.backrefs.length > 0));
    const hasKnownLifespan = hasBirthPoint(person);

    return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons() }
      ${ deckManager.buildUpdateForm() }

      ${ !hasKnownLifespan && html`<${LifespanForm} name=${ person.name } onLifespanGiven=${ onLifespan }/>` }

      ${ deckManager.buildNoteSections() }

      <${SectionBackRefs} state=${state} backrefs=${ person.backrefs } backnotes=${ person.backnotes } deckId=${ person.id }/>
      <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
      ${ hasKnownLifespan && html`<${ListDeckPoints} deckPoints=${ person.all_points_during_life }
    deckManager=${ deckManager }
    dispatch=${ dispatch }
    holderId=${ person.id }
    showAddPointForm=${ state.showAddPointForm }
    holderName=${ person.name }/>`}
      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${personId} depth=${2}/>
    </article>`;
}

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

function UpdatePersonForm({ deck, hideFormFn }) {
    const person = deck || {};
    const [state, dispatch] = useStateValue();

    const [localState, setLocalState] = useState({
        name: person.name || ''
    });

    useEffect(() => {
        if (person.name && person.name !== '' && localState.name === '') {
            setLocalState({
                ...localState,
                name: person.name
            });
        }
    }, [person]);

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
            // hide this form
            hideFormFn();
        });

        e.preventDefault();
    };

    return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <label for="name">Name:</label>
      <br/>
      <${CivilInput} id="name"
                     value=${ localState.name }
                     autoComplete="off"
                     onInput=${ handleChangeEvent } />
      <br/>
      <input type="submit" value="Update Person"/>
    </form>`;
}

function PersonDeckPoint({ deckPoint, hasNotes, noteManager, holderId }) {
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
                  <span onClick=${onClicked}>${ expanded ? svgCaretDown() : hasNotes ? svgCaretRight() : svgCaretRightEmpty() }</span>
                  ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.date_textual }
                  ${ expanded && html`<div class="point-notes">
            ${ noteManager }
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

function ListDeckPoints({ deckPoints, deckManager, holderId, holderName, showAddPointForm, dispatch }) {
    const [onlyThisPerson, setOnlyThisPerson] = useState(false);
    const [showBirthsDeaths, setShowBirthsDeaths] = useState(false);
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
        dispatch({type: showAddPointForm ? "hideAddPointForm" : "showAddPointForm"});
    }
    function onShowDeathFormClicked(e) {
        e.preventDefault();
        setShowDeathForm(!showDeathForm);
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        dispatch({type: "hideAddPointForm"});
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
            fetchDeckListing(dispatch, 'people');
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

    // don't show the person's age for any of their posthumous points
    const deathIndex = arr.findIndex(e => e.deck_id === holderId && e.kind === "PointEnd");
    if (deathIndex) {
        for (let i = deathIndex + 1; i < arr.length; i++) {
            if(arr[i].deck_id === holderId) {
                arr[i].age = 0;
            }
        }
    }

    const dps = arr.map(dp => html`<${PersonDeckPoint}
                                 key=${ dp.id}
                                 noteManager=${ deckManager.noteManagerForDeckPoint(dp) }
                                 hasNotes=${ deckManager.pointHasNotes(dp) }
                                 holderId=${ holderId }
                                 deckPoint=${ dp }/>`);

    const formSidebarText = showAddPointForm ? "Hide Form" : `Add Point for ${ holderName }`;
    const hasDied = deckPoints.some(dp => dp.deck_id === holderId && dp.kind === 'PointEnd');

    return html`
    <${RollableSection} heading='Points during the life of ${ holderName }'>
      <div class="left-margin">
        ${ !hasDied && html`<div class="left-margin-entry clickable" onClick=${ onShowDeathFormClicked }>
        <span class="left-margin-icon-label">Add Died Point</span>
        ${ svgPointAdd() }
    </div>`}
        <${WhenVerbose}>
          <div class="left-margin-entry clickable" onClick=${ onOnlyThisPersonClicked }>
            <span class="left-margin-icon-label">Only ${ holderName }</span>
            ${ onlyThisPerson ? svgTickedCheckBox() : svgUntickedCheckBox() }
          </div>
          ${ !onlyThisPerson && html`<div class="left-margin-entry clickable" onClick=${ onShowOtherClicked }>
        <span class="left-margin-icon-label">Show Other Birth/Deaths</span>
        ${ showBirthsDeaths ? svgTickedCheckBox() : svgUntickedCheckBox() }
    </div>`}
        </${WhenVerbose}>
      </div>

      ${ showDeathForm && deathForm() }
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

export { Person, People };
