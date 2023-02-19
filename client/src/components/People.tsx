import { h } from "preact";
import { Link } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import {
    DeckKind,
    DeckManagerType,
    DeckPerson,
    DeckPoint,
    FatDeck,
    SlimDeck,
    PeopleListings,
    SearchResults,
    NoteManagerType,
    PointKind,
    ProtoPoint,
} from "../types";

import Net from "../Net";
import { calcAgeInYears, dateStringAsTriple } from "../eras";
import {
    buildUrl,
    deckKindToHeadingString,
    fetchDeckListing,
} from "../CivilUtils";
import { getAppState, AppStateChange } from "../AppState";
import {
    svgBlank,
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgPointAdd,
    svgTickedCheckBox,
    svgUntickedCheckBox,
    svgX,
} from "../svgIcons";
import WhenVerbose from "./WhenVerbose";

import CivilInput from "./CivilInput";
import DeckManager from "./DeckManager";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import LifespanForm from "./LifespanForm";
import RollableSection from "./RollableSection";
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionGraph from "./SectionGraph";
import SectionNotes from "./SectionNotes";
import SectionSearchResults from "./SectionSearchResults";
import TopMatter from "./TopMatter";
import { SlimDeckListSection } from "./ListSections";
import { DeluxeToolbar } from "./DeluxeToolbar";
import { InsigniaSelector } from "./Insignias";
import { PointForm } from "./PointForm";

function People({ path }: { path?: string }) {
    const appState = getAppState();
    const deckKind: DeckKind = DeckKind.Person;

    useEffect(() => {
        if (!appState.listing.value.people) {
            let url: string = "/api/people/listings";
            Net.get<PeopleListings>(url).then((listing) => {
                AppStateChange.setPeopleListing(listing);
            });
        }
    }, []);

    const people = appState.listing.value.people;

    if (people) {
        return (
            <article>
                <h1 class="ui">{deckKindToHeadingString(deckKind)}</h1>
                <SlimDeckListSection
                    label="Uncategorised"
                    list={people.uncategorised}
                    expanded
                    hideEmpty
                />
                <SlimDeckListSection
                    label="Ancient"
                    list={people.ancient}
                    expanded
                />
                <SlimDeckListSection
                    label="Medieval"
                    list={people.medieval}
                    expanded
                />
                <SlimDeckListSection
                    label="Modern"
                    list={people.modern}
                    expanded
                />
                <SlimDeckListSection
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

    const [searchResults, setSearchResults]: [Array<SlimDeck>, any] = useState(
        []
    ); // an array of backrefs

    const personId = id ? parseInt(id, 10) : 0;

    const deckKind: DeckKind = DeckKind.Person;
    const deckManager: DeckManagerType = DeckManager({
        id: personId,
        deckKind,
        preCacheFn,
        hasSummarySection: true,
        hasReviewSection: false,
    });

    useEffect(() => {
        Net.get<SearchResults>(`/api/people/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    function dispatchUpdatedPerson(person?: DeckPerson) {
        fetchDeckListing(deckKind, "/api/people/listings");
    }

    function onLifespan(birthPoint: ProtoPoint, deathPoint?: ProtoPoint) {
        Net.post<ProtoPoint, DeckPerson>(
            `/api/people/${personId}/points`,
            birthPoint
        ).then((person) => {
            if (deathPoint) {
                Net.post<ProtoPoint, DeckPerson>(
                    `/api/people/${personId}/points`,
                    deathPoint
                ).then((person) => {
                    dispatchUpdatedPerson(person);
                });
            } else {
                dispatchUpdatedPerson(person);
            }
        });
    }

    function hasBirthPoint(person: FatDeck) {
        function hasBirth(point: DeckPoint) {
            return point.title === "Born" && point.deckId === person.id;
        }

        if (person.points) {
            return person.points.find(hasBirth);
        }
        return false;
    }

    const deck: DeckPerson | undefined = deckManager.getDeck() as
        | DeckPerson
        | undefined;
    if (deck) {
        const title = deck && deck.title;
        const hasKnownLifespan = deck && hasBirthPoint(deck);
        return (
            <article>
                <DeluxeToolbar />

                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    onRefsToggle={deckManager.onRefsToggle}
                    onFormToggle={deckManager.onFormToggle}
                ></TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <div>
                        <DeleteDeckConfirmation
                            deckKind={DeckKind.Person}
                            id={personId}
                        />
                        <SectionUpdatePerson
                            person={deck}
                            onUpdate={deckManager.updateAndReset}
                        />
                    </div>
                )}

                {title && !hasKnownLifespan && (
                    <LifespanForm
                        title={title}
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
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckKind}
                    howToShowNoteSection={deckManager.howToShowNoteSection}
                    canShowNoteSection={deckManager.canShowNoteSection}
                    onUpdateDeck={deckManager.update}
                />

                <SectionBackRefs deck={deck} />

                <SectionSearchResults searchResults={searchResults} />
                {hasKnownLifespan && (
                    <ListDeckPoints
                        deckPoints={deck.points}
                        deckManager={deckManager}
                        holderId={deck.id}
                        showAddPointForm={appState.showAddPointForm.value}
                        holderTitle={deck.title}
                    />
                )}
                <SectionGraph depth={2} deck={deck} />
            </article>
        );
    } else {
        return (
            <article>
                <DeluxeToolbar />
            </article>
        );
    }
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person: FatDeck): FatDeck {
    function getBirthDateFromPoints(points: Array<DeckPoint>) {
        const kind: PointKind = PointKind.PointBegin;
        const p = points.find((p) => p.kind === kind && p.deckId === person.id);
        if (!p || !p.date) {
            return undefined;
        }

        let triple = dateStringAsTriple(p.date);
        return triple;
    }

    // point is an element in points
    function addAge(point: DeckPoint, born: [number, number, number]) {
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

    if (person.points) {
        let born: [number, number, number] | undefined = getBirthDateFromPoints(
            person.points
        );
        if (born) {
            let b: [number, number, number] = born;
            // we have a birth year so we can add the age of the person to each of the points elements
            person.points.forEach((p) => addAge(p, b));
        }
    }

    return person;
}

function SectionUpdatePerson({
    person,
    onUpdate,
}: {
    person: DeckPerson;
    onUpdate: (p: FatDeck) => void;
}) {
    const [localState, setLocalState] = useState({
        title: person.title || "",
        insigniaId: person.insignia || 0,
    });

    useEffect(() => {
        if (person.title && person.title !== "" && localState.title === "") {
            setLocalState({
                ...localState,
                title: person.title,
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
                    title: value,
                });
            }
        }
    };

    const handleSubmit = (e: Event) => {
        type Data = {
            title: string;
            insignia: number;
        };

        const data: Data = {
            title: localState.title.trim(),
            insignia: localState.insigniaId,
        };

        // edit an existing person
        Net.put<Data, DeckPerson>(`/api/people/${person.id}`, data).then(
            (newDeck) => {
                onUpdate(newDeck);
            }
        );

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
                value={localState.title}
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
    deckPoint: DeckPoint;
    hasNotes: boolean;
    noteManager: NoteManagerType;
    holderId: number;
}) {
    let [expanded, setExpanded] = useState(false);

    function onClicked(e: Event) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    let pointTitle = deckPoint.title;

    let ageText = deckPoint.age! > 0 ? `${deckPoint.age}` : "";

    if (deckPoint.deckId === holderId) {
        return (
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
        return (
            <li class="deckpoint">
                <Link href={buildUrl(deckPoint.deckKind, deckPoint.deckId)}>
                    <span class="deckpoint-age">{ageText}</span>
                    {svgBlank()}
                    {deckPoint.deckName} - {pointTitle} {deckPoint.dateTextual}
                </Link>
            </li>
        );
    }
}

function ListDeckPoints({
    deckPoints,
    deckManager,
    holderId,
    holderTitle,
    showAddPointForm,
}: {
    deckPoints: Array<DeckPoint> | undefined;
    deckManager: DeckManagerType;
    holderId: number;
    holderTitle: string;
    showAddPointForm: boolean;
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

    function onAddDeathPoint(point: DeckPoint) {
        Net.post<DeckPoint, DeckPerson>(
            `/api/people/${holderId}/points`,
            point
        ).then((_person) => {
            setShowDeathForm(false);
        });
    }

    function deathForm() {
        return (
            <PointForm
                pointKind={PointKind.PointEnd}
                pointTitle="Died"
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
        (e) => e.deckId === holderId && e.kind === PointKind.PointEnd
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
        : `Add Point for { holderTitle }`;
    const hasDied =
        deckPoints &&
        deckPoints.some(
            (dp) => dp.deckId === holderId && dp.kind === PointKind.PointEnd
        );

    const sectionTitle = `Points during the life of ${holderTitle}`;
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
                            Only {holderTitle}
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
