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
import LifespanForm from '/js/components/LifespanForm.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';
import { DeckManager } from '/js/components/DeckManager.js';
import { PointForm } from '/js/components/PointForm.js';
import { WhenVerbose } from '/js/components/WhenVerbose.js';

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
    const [state, dispatch] = useStateValue();

    const [searchResults, setSearchResults] = useState([]); // an array of backrefs

    const personId = parseInt(id, 10);

    const deckManager = DeckManager({
        id: personId,
        resource: "people",
        preCacheFn: preCacheFn,
        updateForm: UpdatePersonForm,
        hasSummarySection: true,
        hasReviewSection: false
    });

    useEffect(() => {
        Net.get(`/api/people/${id}/additional_search`).then(search_results => {
            setSearchResults(search_results.results);
        });
    }, [id]);

    function dispatchUpdatedPerson(person) {
        dispatch({
            type: 'updatePeopleListing',
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

    const hasKnownLifespan = !!state.deckManagerState.deck && hasBirthPoint(state.deckManagerState.deck);

    const person = state.deckManagerState.deck;
    const name = state.deckManagerState.deck && state.deckManagerState.deck.name;

    return html`
    <article>
        ${ deckManager.title }
        ${ deckManager.buildUpdateForm() }
        ${ deckManager.buildDeleteForm() }

        ${ !hasKnownLifespan && html`<${LifespanForm} name=${ name } onLifespanGiven=${ onLifespan }/>` }
        ${ deckManager.buildDeckRefSection() }
        ${ deckManager.buildNoteSections() }
        ${ deckManager.buildSectionBackRefs() }

        <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
        ${ hasKnownLifespan && html`
            <${ListDeckPoints} deckPoints=${ person.all_points_during_life }
                               deckManager=${ deckManager }
                               dispatch=${ dispatch }
                               holderId=${ person.id }
                               showAddPointForm=${ state.showAddPointForm }
                               holderName=${ person.name }/>`}

        ${ deckManager.buildGraphSection() }
    </article>`;
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person) {
    // todo: remove this???
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

function UpdatePersonForm({ deck, hideFormFn, deckModifiedFn }) {
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
            deckModifiedFn(newItem);
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
        item = html`
        <li class='relevent-deckpoint'>
            <span class="deckpoint-age">${ ageText }</span>
            <span onClick=${onClicked}>${ expanded ? svgCaretDown() : hasNotes ? svgCaretRight() : svgCaretRightEmpty() }</span>
            ${ deckPoint.deck_name } - ${ pointTitle } ${ deckPoint.date_textual }
            ${ expanded && html`
                <div class="point-notes">
                    ${ noteManager }
                </div>`}
        </li>`;
    } else {
        item = html`
        <li class='deckpoint'>
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

    const dps = arr.map(dp => html`
    <${PersonDeckPoint} key=${ dp.id}
                        noteManager=${ deckManager.noteManagerForDeckPoint(dp) }
                        hasNotes=${ deckManager.pointHasNotes(dp) }
                        holderId=${ holderId }
                        deckPoint=${ dp }/>`);

    const formSidebarText = showAddPointForm ? "Hide Form" : `Add Point for ${ holderName }`;
    const hasDied = deckPoints.some(dp => dp.deck_id === holderId && dp.kind === 'PointEnd');

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
