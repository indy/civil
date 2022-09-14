import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, fetchDeckListing } from '/js/CivilUtils.js';
import { capitalise } from '/js/JsUtils.js';
import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { addChronologicalSortYear,
         calcAgeInYears,
         dateStringAsTriple } from '/js/eras.js';
import { svgPointAdd,
         svgX,
         svgCaretDown,
         svgCaretRight,
         svgCaretRightEmpty,
         svgBlank,
         svgTickedCheckBox,
         svgUntickedCheckBox } from '/js/svgIcons.js';

import CivilInput from '/js/components/CivilInput.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import SectionGraph from '/js/components/SectionGraph.js';
import LifespanForm from '/js/components/LifespanForm.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionNotes from '/js/components/SectionNotes.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import DeckManager from '/js/components/DeckManager.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';
import { PointForm } from '/js/components/PointForm.js';
import Title from '/js/components/Title.js';
import WhenVerbose from '/js/components/WhenVerbose.js';

function People() {
    const [state, dispatch] = useStateValue();
    const resource = 'people';

    ensureListingLoaded(resource, '/api/people/listings');

    const people = state.listing.people || [];

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>
        <${DeckSimpleListSection} label='Uncategorised' list=${people.uncategorised} expanded hideEmpty/>
        <${DeckSimpleListSection} label='Ancient' list=${people.ancient} expanded/>
        <${DeckSimpleListSection} label='Medieval' list=${people.medieval} expanded/>
        <${DeckSimpleListSection} label='Modern' list=${people.modern} expanded/>
        <${DeckSimpleListSection} label='Contemporary' list=${people.contemporary} expanded/>
    </article>`;
}

function Person({ id }) {
    const [state, appDispatch] = useStateValue();

    const [searchResults, setSearchResults] = useState([]); // an array of backrefs

    const personId = parseInt(id, 10);

    const deckManager = DeckManager({
        id: personId,
        resource: "people",
        preCacheFn: preCacheFn,
        hasSummarySection: true,
        hasReviewSection: false
    });

    useEffect(() => {
        Net.get(`/api/people/${id}/additional_search`).then(searchResults => {
            setSearchResults(searchResults.results);
        });
    }, [id]);

    function dispatchUpdatedPerson(person) {
        appDispatch({
            type: 'updatePeopleListing',
            newItem: preCacheFn(person)
        });

        // also update the people list now that this person is no longer uncategorised
        fetchDeckListing(appDispatch, 'people');
    }

    function onLifespan(birthPoint, deathPoint) {
        Net.post(`/api/people/${personId}/points`, birthPoint).then(person => {
            if (deathPoint) {
                Net.post(`/api/people/${personId}/points`, deathPoint).then(person => {
                    appDispatchUpdatedPerson(person);
                });
            } else {
                appDispatchUpdatedPerson(person);
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

    const hasKnownLifespan = !!state.deckManagerState.deck && hasBirthPoint(state.deckManagerState.deck);

    const person = state.deckManagerState.deck;
    const name = state.deckManagerState.deck && state.deckManagerState.deck.name;

    return html`
    <article>
        <${Title} title=${ deckManager.title }/>
        <${SectionUpdatePerson}/>
        <${DeleteDeckConfirmation} resource='people' id=${personId}/>

        ${ name && !hasKnownLifespan && html`<${LifespanForm} name=${ name } onLifespanGiven=${ onLifespan }/>` }

        <${SectionDeckRefs} onRefsChanged=${ deckManager.onRefsChanged }/>

        <${SectionNotes} title=${ deckManager.title } onRefsChanged=${ deckManager.onRefsChanged } preCacheFn=${preCacheFn} resource="people"/>

        <${SectionBackRefs} deckId=${ personId }/>

        <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
        ${ hasKnownLifespan && html`
            <${ListDeckPoints} deckPoints=${ person.allPointsDuringLife }
                               deckManager=${ deckManager }
                               dispatch=${ appDispatch }
                               holderId=${ person.id }
                               showAddPointForm=${ state.showAddPointForm }
                               holderName=${ person.name }/>`}
        <${SectionGraph} depth=${ 2 } />
    </article>`;
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person) {
    // todo: remove this???
    if (person.points) {
        person.points = person.points
            .map(addChronologicalSortYear)
            .sort((a, b) => a.sortYear > b.sortYear);
    }

    function getExactDateFromPoints(points, kind) {
        const p = points.find(p => p.kind === kind);
        if (!p || !p.exactDate) {
            return null;
        }

        let triple = dateStringAsTriple(p.exactDate);
        return triple;
    }

    // point is an element in allPointsDuringLife
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
        // we have a birth year so we can add the age of the person to each of the allPointsDuringLife elements
        person.allPointsDuringLife.forEach(p => addAge(p, born));
    }

    return person;
}

function SectionUpdatePerson() {
    const [state, appDispatch] = useStateValue();

    const person = state.deckManagerState.deck || {};


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
        Net.put(`/api/people/${person.id}`, data).then(newDeck => {
            appDispatch({type: 'dms-update-deck', data: { deck: newDeck, resource: 'people'}});
            appDispatch({type: 'dms-hide-form'});
        });

        e.preventDefault();
    };

    if (!state.deckManagerState.showUpdateForm) {
        return html`<div></div>`;
    }

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

    if (deckPoint.deckId === holderId) {
        item = html`
        <li class='relevent-deckpoint'>
            <span class="deckpoint-age">${ ageText }</span>
            <span onClick=${onClicked}>${ expanded ? svgCaretDown() : hasNotes ? svgCaretRight() : svgCaretRightEmpty() }</span>
            ${ deckPoint.deckName } - ${ pointTitle } ${ deckPoint.dateTextual }
            ${ expanded && html`
                <div class="point-notes">
                    ${ noteManager }
                </div>`}
        </li>`;
    } else {
        item = html`
        <li class='deckpoint'>
            <${Link} href='/${deckPoint.deckResource}/${deckPoint.deckId}' >
                <span class="deckpoint-age">${ ageText }</span>
                ${ svgBlank() }
                ${ deckPoint.deckName } - ${ pointTitle } ${ deckPoint.dateTextual }
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
                type: 'updatePeopleListing',
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
        <${PointForm} pointKind="pointEnd"
                      point=${ point }
                      onSubmit=${ onAddDeathPoint }
                      submitMessage="Create Death Point"/>`;
    }


    let arr = deckPoints || [];
    if (onlyThisPerson) {
        arr = arr.filter(e => e.deckId === holderId);
    }
    if (!showBirthsDeaths) {
        arr = arr.filter(e => e.deckId === holderId || !(e.title === "Born" || e.title === "Died"));
    }

    // don't show the person's age for any of their posthumous points
    const deathIndex = arr.findIndex(e => e.deckId === holderId && e.kind === "PointEnd");
    if (deathIndex) {
        for (let i = deathIndex + 1; i < arr.length; i++) {
            if(arr[i].deckId === holderId) {
                arr[i].age = 0;
            }
        }
    }

    const dps = arr.map(dp => html`
    <${PersonDeckPoint} key=${ dp.id}
                        noteManager=${ deckManager.noteManagerForDeckPoint(dp) }
                        hasNotes=${ deckManager.pointHasNotes(dp) }
                        holderId=${ holderId }
                        deckPoint=${ dp }/>`);

    const formSidebarText = showAddPointForm ? "Hide Form" : `Add Point for ${ holderName }`;
    const hasDied = deckPoints.some(dp => dp.deckId === holderId && dp.kind === 'PointEnd');

    return html`
    <${RollableSection} heading='Points during the life of ${ holderName }'>
        <div class="left-margin">
            ${ !hasDied && html`
                <div class="left-margin-entry clickable" onClick=${ onShowDeathFormClicked }>
                    <span class="left-margin-icon-label">Add Died Point</span>
                    ${ svgPointAdd() }
                </div>`}
            <${WhenVerbose}>
                <div class="left-margin-entry clickable" onClick=${ onOnlyThisPersonClicked }>
                    <span class="left-margin-icon-label">Only ${ holderName }</span>
                    ${ onlyThisPerson ? svgTickedCheckBox() : svgUntickedCheckBox() }
                </div>
                ${ !onlyThisPerson && html`
                    <div class="left-margin-entry clickable" onClick=${ onShowOtherClicked }>
                        <span class="left-margin-icon-label">Show Other Birth/Deaths</span>
                        ${ showBirthsDeaths ? svgTickedCheckBox() : svgUntickedCheckBox() }
                    </div>`}
            </${WhenVerbose}>
        </div>
        ${ showDeathForm && deathForm() }
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

export { Person, People };
