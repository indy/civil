import { h } from "preact";
import { Link } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import {
    IPerson,
    IDeckSimple,
    ISearchResults,
    IPeopleListings,
} from "../types";

import { getAppState, AppStateChange } from "../AppState";
import { fetchDeckListing, deckTitle } from "../CivilUtils";
import { capitalise } from "../JsUtils";
import Net from "../Net";
import { calcAgeInYears, dateStringAsTriple } from "../eras";
import {
    svgPointAdd,
    svgX,
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgBlank,
    svgTickedCheckBox,
    svgUntickedCheckBox,
} from "../svgIcons";
import WhenVerbose from "./WhenVerbose";

import CivilInput from "./CivilInput";
import DeckManager from "./DeckManager";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import { InsigniaSelector } from "./Insignias";
import LifespanForm from "./LifespanForm";
import RollableSection from "./RollableSection";
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionGraph from "./SectionGraph";
import SectionNotes from "./SectionNotes";
import SectionSearchResultsBackref from "./SectionSearchResultsBackref";
import TopMatter from "./TopMatter";
import { DeckSimpleListSection } from "./ListSections";
import { DeluxeToolbar } from "./DeluxeToolbar";
import { PointForm } from "./PointForm";

function People({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "people";

    useEffect(() => {
        if (!appState.listing.value.articles) {
            let url: string = "/api/people/listings";
            Net.get<IPeopleListings>(url).then((listing) => {
                AppStateChange.setPeopleListing(listing);
            });
        }
    }, []);

    const people = appState.listing.value.people;

    if (people) {
        return (
            <article>
                <h1 class="ui">{capitalise(resource)}</h1>
                <DeckSimpleListSection
                    label="Uncategorised"
                    list={people.uncategorised}
                    expanded
                    hideEmpty
                />
                <DeckSimpleListSection
                    label="Ancient"
                    list={people.ancient}
                    expanded
                />
                <DeckSimpleListSection
                    label="Medieval"
                    list={people.medieval}
                    expanded
                />
                <DeckSimpleListSection
                    label="Modern"
                    list={people.modern}
                    expanded
                />
                <DeckSimpleListSection
                    label="Contemporary"
                    list={people.contemporary}
                    expanded
                />
            </article>
        );
    } else {
        return <div></div>;
    }
}

function Person({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const [searchResults, setSearchResults]: [Array<IDeckSimple>, any] =
        useState([]); // an array of backrefs

    const personId = id ? parseInt(id, 10) : 0;

    const resource = "people";
    const deckManager = DeckManager({
        id: personId,
        resource,
        preCacheFn,
        hasSummarySection: true,
        hasReviewSection: false,
    });

    useEffect(() => {
        Net.get<ISearchResults>(`/api/people/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    function dispatchUpdatedPerson(person?: any) {
        fetchDeckListing(resource, "/api/people/listings");
    }

    function onLifespan(birthPoint?: any, deathPoint?: any) {
        Net.post(`/api/people/${personId}/points`, birthPoint).then(
            (person) => {
                if (deathPoint) {
                    Net.post(`/api/people/${personId}/points`, deathPoint).then(
                        (person) => {
                            dispatchUpdatedPerson(person);
                        }
                    );
                } else {
                    dispatchUpdatedPerson(person);
                }
            }
        );
    }

    function hasBirthPoint(person?: any) {
        function hasBirth(point?: any) {
            return point.title === "Born" && point.deckId === person.id;
        }

        if (person.points) {
            return person.points.find(hasBirth);
        }
        return false;
    }

    const deck: any = deckManager.getDeck();
    const name = deck && deck.name;
    const hasKnownLifespan = deck && hasBirthPoint(deck);

    return (
        <article>
            <DeluxeToolbar />

            <TopMatter
                title={deckTitle(deck)}
                deck={deck}
                isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                onRefsToggle={deckManager.onRefsToggle}
                onFormToggle={deckManager.onFormToggle}
            ></TopMatter>

            {deckManager.isShowingUpdateForm() && (
                <div>
                    <DeleteDeckConfirmation resource="people" id={personId} />
                    <SectionUpdatePerson
                        person={deck}
                        onUpdate={deckManager.updateAndReset}
                    />
                </div>
            )}

            {name && !hasKnownLifespan && (
                <LifespanForm
                    name={name}
                    onLifespanGiven={onLifespan}
                    oldestAliveAge={appState.oldestAliveAge}
                />
            )}

            <SectionDeckRefs
                deck={deck}
                isEditing={deckManager.isEditingDeckRefs()}
                onRefsChanged={deckManager.onRefsChanged}
                onRefsToggle={deckManager.onRefsToggle}
            />

            <SectionNotes
                deck={deck}
                title={deckTitle(deck)}
                onRefsChanged={deckManager.onRefsChanged}
                resource="people"
                howToShowNoteSection={deckManager.howToShowNoteSection}
                canShowNoteSection={deckManager.canShowNoteSection}
                onUpdateDeck={deckManager.update}
            />

            <SectionBackRefs deck={deck} />

            <SectionSearchResultsBackref backrefs={searchResults} />
            {hasKnownLifespan && (
                <ListDeckPoints
                    deckPoints={deck.points}
                    deckManager={deckManager}
                    holderId={deck.id}
                    showAddPointForm={appState.showAddPointForm.value}
                    holderName={deck.name}
                />
            )}
            <SectionGraph depth={2} deck={deck} />
        </article>
    );
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person?: any) {
    function getBirthDateFromPoints(points?: any) {
        const kind = "PointBegin";
        const p = points.find((p) => p.kind === kind && p.deckId === person.id);
        if (!p || !p.date) {
            return null;
        }

        let triple = dateStringAsTriple(p.date);
        return triple;
    }

    // point is an element in points
    function addAge(point?: any, born?: any) {
        if (!point.date) {
            console.log("no date???");
            return point;
        }

        let eventTriple: [number, number, number] = dateStringAsTriple(
            point.date
        )!;
        let years = calcAgeInYears(eventTriple, born);

        point.age = years;

        return point;
    }

    let born = getBirthDateFromPoints(person.points);
    if (born) {
        // we have a birth year so we can add the age of the person to each of the points elements
        person.points.forEach((p) => addAge(p, born));
    }

    return person;
}

function SectionUpdatePerson({
    person,
    onUpdate,
}: {
    person?: any;
    onUpdate?: any;
}) {
    const [localState, setLocalState] = useState({
        name: person.name || "",
        insigniaId: person.insignia || 0,
    });

    useEffect(() => {
        if (person.name && person.name !== "" && localState.name === "") {
            setLocalState({
                ...localState,
                name: person.name,
            });
        }

        if (person.insignia) {
            setLocalState({
                ...localState,
                insigniaId: person.insignia,
            });
        }
    }, [person]);

    const handleChangeEvent = (e: Event) => {
        if (e.target instanceof HTMLInputElement) {
            const target = e.target;
            const name = target.name;
            const value = target.value;

            if (name === "name") {
                setLocalState({
                    ...localState,
                    name: value,
                });
            }
        }
    };

    const handleSubmit = (e: Event) => {
        const data = {
            name: localState.name.trim(),
            insignia: localState.insigniaId,
        };

        // edit an existing person
        Net.put(`/api/people/${person.id}`, data).then((newDeck) => {
            onUpdate(newDeck);
        });

        e.preventDefault();
    };

    const setInsigniaId = (id) => {
        setLocalState({
            ...localState,
            insigniaId: id,
        });
    };

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="name">Name:</label>
            <br />
            <CivilInput
                id="name"
                value={localState.name}
                onInput={handleChangeEvent}
            />
            <br />

            <InsigniaSelector
                insigniaId={localState.insigniaId}
                onChange={setInsigniaId}
            />
            <br />

            <input type="submit" value="Update Person" />
        </form>
    );
}

function PersonDeckPoint({
    deckPoint,
    hasNotes,
    noteManager,
    holderId,
}: {
    deckPoint?: any;
    hasNotes?: any;
    noteManager?: any;
    holderId?: any;
}) {
    let [expanded, setExpanded] = useState(false);

    function onClicked(e: Event) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    let pointTitle = deckPoint.title;

    let item;
    let ageText = deckPoint.age > 0 ? `${deckPoint.age}` : "";

    if (deckPoint.deckId === holderId) {
        item = (
            <li class="relevent-deckpoint">
                <span class="deckpoint-age">{ageText}</span>
                <span onClick={onClicked}>
                    {expanded
                        ? svgCaretDown()
                        : hasNotes
                        ? svgCaretRight()
                        : svgCaretRightEmpty()}
                </span>
                {deckPoint.deckName} - {pointTitle} {deckPoint.dateTextual}
                {expanded && <div class="point-notes">{noteManager}</div>}
            </li>
        );
    } else {
        let hreff = `/${deckPoint.deckResource}/${deckPoint.deckId}`;
        item = (
            <li class="deckpoint">
                <Link href={hreff}>
                    <span class="deckpoint-age">{ageText}</span>
                    {svgBlank()}
                    {deckPoint.deckName} - {pointTitle} {deckPoint.dateTextual}
                </Link>
            </li>
        );
    }

    return item;
}

function ListDeckPoints({
    deckPoints,
    deckManager,
    holderId,
    holderName,
    showAddPointForm,
}: {
    deckPoints?: any;
    deckManager?: any;
    holderId?: any;
    holderName?: any;
    showAddPointForm?: any;
}) {
    const [onlyThisPerson, setOnlyThisPerson] = useState(false);
    const [showBirthsDeaths, setShowBirthsDeaths] = useState(false);
    const [showDeathForm, setShowDeathForm] = useState(false);

    function onOnlyThisPersonClicked(e: Event) {
        e.preventDefault();
        setOnlyThisPerson(!onlyThisPerson);
    }
    function onShowOtherClicked(e: Event) {
        e.preventDefault();
        setShowBirthsDeaths(!showBirthsDeaths);
    }
    function onAddPointClicked(e: Event) {
        e.preventDefault();
        showAddPointForm
            ? AppStateChange.hideAddPointForm()
            : AppStateChange.showAddPointForm();
    }
    function onShowDeathFormClicked(e: Event) {
        e.preventDefault();
        setShowDeathForm(!showDeathForm);
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        AppStateChange.hideAddPointForm();
    }

    function onAddDeathPoint(point: any) {
        Net.post<any, IPerson>(`/api/people/${holderId}/points`, point).then(
            (person) => {
                setShowDeathForm(false);
            }
        );
    }

    function deathForm() {
        let point = {
            title: "Died",
        };
        return (
            <PointForm
                pointKind="pointEnd"
                point={point}
                onSubmit={onAddDeathPoint}
                submitMessage="Create Death Point"
            />
        );
    }

    let arr = deckPoints || [];
    if (onlyThisPerson) {
        arr = arr.filter((e) => e.deckId === holderId);
    }
    if (!showBirthsDeaths) {
        arr = arr.filter(
            (e) =>
                e.deckId === holderId ||
                !(e.title === "Born" || e.title === "Died")
        );
    }

    // don't show the person's age for any of their posthumous points
    const deathIndex = arr.findIndex(
        (e) => e.deckId === holderId && e.kind === "PointEnd"
    );
    if (deathIndex) {
        for (let i = deathIndex + 1; i < arr.length; i++) {
            if (arr[i].deckId === holderId) {
                arr[i].age = 0;
            }
        }
    }

    const dps = arr.map((dp) => (
        <PersonDeckPoint
            key={dp.id}
            noteManager={deckManager.noteManagerForDeckPoint(dp)}
            hasNotes={deckManager.pointHasNotes(dp)}
            holderId={holderId}
            deckPoint={dp}
        />
    ));

    const formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for { holderName }`;
    const hasDied = deckPoints.some(
        (dp) => dp.deckId === holderId && dp.kind === "PointEnd"
    );

    const sectionTitle = `Points during the life of ${holderName}`;
    return (
        <RollableSection heading={sectionTitle}>
            <div class="left-margin">
                {!hasDied && (
                    <div
                        class="left-margin-entry fadeable clickable"
                        onClick={onShowDeathFormClicked}
                    >
                        <span class="left-margin-icon-label">
                            Add Died Point
                        </span>
                        {svgPointAdd()}
                    </div>
                )}
                <WhenVerbose>
                    <div
                        class="left-margin-entry fadeable clickable"
                        onClick={onOnlyThisPersonClicked}
                    >
                        <span class="left-margin-icon-label">
                            Only {holderName}
                        </span>
                        {onlyThisPerson
                            ? svgTickedCheckBox()
                            : svgUntickedCheckBox()}
                    </div>
                    {!onlyThisPerson && (
                        <div
                            class="left-margin-entry fadeable clickable"
                            onClick={onShowOtherClicked}
                        >
                            <span class="left-margin-icon-label">
                                Show Other Birth/Deaths
                            </span>
                            {showBirthsDeaths
                                ? svgTickedCheckBox()
                                : svgUntickedCheckBox()}
                        </div>
                    )}
                </WhenVerbose>
            </div>
            {showDeathForm && deathForm()}
            <ul class="unstyled-list hug-left">{dps}</ul>
            <WhenVerbose>
                <div class="left-margin">
                    <div
                        class="left-margin-entry fadeable clickable"
                        onClick={onAddPointClicked}
                    >
                        <span class="left-margin-icon-label">
                            {formSidebarText}
                        </span>
                        {showAddPointForm ? svgX() : svgPointAdd()}
                    </div>
                </div>
            </WhenVerbose>
            {showAddPointForm && deckManager.buildPointForm(onPointCreated)}
        </RollableSection>
    );
}

export { Person, People };
