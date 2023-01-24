import { html, Link, useState, useEffect } from '/lib/preact/mod.js';

import { InsigniaSelector } from '/js/components/Insignias.js';

import { getAppState, AppStateChange } from '/js/AppState.js';
import { ensureListingLoaded, fetchDeckListing, deckTitle } from '/js/CivilUtils.js';
import { capitalise } from '/js/JsUtils.js';
import Net from '/js/Net.js';
import { calcAgeInYears,
         dateStringAsTriple } from '/js/eras.js';
import { svgPointAdd,
         svgX,
         svgCaretDown,
         svgCaretRight,
         svgCaretRightEmpty,
         svgBlank,
         svgTickedCheckBox,
         svgUntickedCheckBox } from '/js/svgIcons.js';
import WhenVerbose from '/js/components/WhenVerbose.js';

import CivilInput from '/js/components/CivilInput.js';
import DeckManager from '/js/components/DeckManager.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import LifespanForm from '/js/components/LifespanForm.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionGraph from '/js/components/SectionGraph.js';
import SectionNotes from '/js/components/SectionNotes.js';
import SectionSearchResultsBackref from '/js/components/SectionSearchResultsBackref.js';
import Title from '/js/components/Title.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';
import { DeluxeToolbar, TOOLBAR_VIEW } from '/js/components/DeluxeToolbar.js';
import { PointForm } from '/js/components/PointForm.js';

function People() {
    const appState = getAppState();
    const resource = 'people';

    ensureListingLoaded(resource, '/api/people/listings');

    const people = appState.listing.value.people || [];

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
    const appState = getAppState();

    const [searchResults, setSearchResults] = useState([]); // an array of backrefs

    const personId = parseInt(id, 10);

    const resource = "people";
    const deckManager = DeckManager({
        id: personId,
        resource,
        preCacheFn,
        hasSummarySection: true,
        hasReviewSection: false
    });

    useEffect(() => {
        Net.get(`/api/people/${id}/additional_search`).then(searchResults => {
            setSearchResults(searchResults.results);
        });
    }, [id]);

    function dispatchUpdatedPerson(person) {
        fetchDeckListing(resource, '/api/people/listings');
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
            return point.title === "Born" && point.deckId === person.id;
        }

        if (person.points) {
            return person.points.find(hasBirth);
        };
        return false;
    }

    const deck = deckManager.getDeck();
    const name = deck && deck.name;
    const hasKnownLifespan = deck && hasBirthPoint(deck);

    return html`
    <article>
        <${DeluxeToolbar}/>
        <${Title} title=${ deckTitle(deck) } isShowingUpdateForm=${deckManager.isShowingUpdateForm()} isEditingDeckRefs=${deckManager.isEditingDeckRefs()} onRefsToggle=${ deckManager.onRefsToggle } onFormToggle=${ deckManager.onFormToggle } />
        ${ deckManager.isShowingUpdateForm() && html`
            <${DeleteDeckConfirmation} resource='people' id=${personId}/>
            <${SectionUpdatePerson} person=${deck} onUpdate=${ deckManager.updateAndReset }/>
        `}

        ${ name && !hasKnownLifespan && html`<${LifespanForm} name=${ name } onLifespanGiven=${ onLifespan } oldestAliveAge=${ appState.oldestAliveAge }/>` }

        <${SectionDeckRefs} deck=${ deck } isEditing=${ deckManager.isEditingDeckRefs() } onRefsChanged=${ deckManager.onRefsChanged } onRefsToggle=${ deckManager.onRefsToggle }/>

        <${SectionNotes} deck=${ deck }
                         title=${ deckTitle(deck) }
                         onRefsChanged=${ deckManager.onRefsChanged }
                         resource="people"
                         howToShowNoteSection=${ deckManager.howToShowNoteSection }
                         canShowNoteSection=${ deckManager.canShowNoteSection }
                         onUpdateDeck=${ deckManager.update }/>

        <${SectionBackRefs} deck=${ deck } />

        <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
        ${ hasKnownLifespan && html`
            <${ListDeckPoints} deckPoints=${ deck.points }
                               deckManager=${ deckManager }
                               holderId=${ deck.id }
                               showAddPointForm=${ appState.showAddPointForm.value }
                               holderName=${ deck.name }/>`}
        <${SectionGraph} depth=${ 2 } deck=${ deck }/>
    </article>`;
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person) {
    function getBirthDateFromPoints(points) {
        const kind = "PointBegin";
        const p = points.find(p => (p.kind === kind) && (p.deckId === person.id));
        if (!p || !p.date) {
            return null;
        }

        let triple = dateStringAsTriple(p.date);
        return triple;
    }

    // point is an element in points
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

    let born = getBirthDateFromPoints(person.points);
    if (born) {
        // we have a birth year so we can add the age of the person to each of the points elements
        person.points.forEach(p => addAge(p, born));
    }

    return person;
}

function SectionUpdatePerson({ person, onUpdate }) {
    const [localState, setLocalState] = useState({
        name: person.name || '',
        insigniaId: person.insignia || 0
    });

    useEffect(() => {
        if (person.name && person.name !== '' && localState.name === '') {
            setLocalState({
                ...localState,
                name: person.name
            });
        }

        if (person.insignia) {
            setLocalState({
                ...localState,
                insigniaId: person.insignia
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
            name: localState.name.trim(),
            insignia: localState.insigniaId
        };

        // edit an existing person
        Net.put(`/api/people/${person.id}`, data).then(newDeck => {
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
        <label for="name">Name:</label>
        <br/>
        <${CivilInput} id="name"
                       value=${ localState.name }
                       onInput=${ handleChangeEvent } />
        <br/>

        <${InsigniaSelector} insigniaId=${localState.insigniaId} onChange=${setInsigniaId}/>
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

function ListDeckPoints({ deckPoints, deckManager, holderId, holderName, showAddPointForm }) {
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
        showAddPointForm ? AppStateChange.hideAddPointForm() : AppStateChange.showAddPointForm();
    }
    function onShowDeathFormClicked(e) {
        e.preventDefault();
        setShowDeathForm(!showDeathForm);
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        AppStateChange.hideAddPointForm();
    }

    function onAddDeathPoint(point) {
        Net.post(`/api/people/${holderId}/points`, point).then(person => {
            setShowDeathForm(false);
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
                <div class="left-margin-entry fadeable clickable" onClick=${ onShowDeathFormClicked }>
                    <span class="left-margin-icon-label">Add Died Point</span>
                    ${ svgPointAdd() }
                </div>`}
            <${WhenVerbose}>
                <div class="left-margin-entry fadeable clickable" onClick=${ onOnlyThisPersonClicked }>
                    <span class="left-margin-icon-label">Only ${ holderName }</span>
                    ${ onlyThisPerson ? svgTickedCheckBox() : svgUntickedCheckBox() }
                </div>
                ${ !onlyThisPerson && html`
                    <div class="left-margin-entry fadeable clickable" onClick=${ onShowOtherClicked }>
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
                <div class="left-margin-entry fadeable clickable" onClick=${ onAddPointClicked }>
                    <span class="left-margin-icon-label">${ formSidebarText }</span>
                    ${ showAddPointForm ? svgX() : svgPointAdd() }
                </div>
            </div>
        </${WhenVerbose}>
        ${ showAddPointForm && deckManager.buildPointForm(onPointCreated) }
    </${RollableSection}>`;
}

export { Person, People };
