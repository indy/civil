import { h } from "preact";
import { Link } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import {
    DeckKind,
    DeckManagerFlags,
    DM,
    DeckPerson,
    DeckPoint,
    Key,
    SlimDeck,
    PeopleListings,
    SearchResults,
    PassageType,
    PointKind,
    ProtoPoint,
} from "types";

import Net from "utils/net";
import { calcAgeInYears, dateStringAsTriple } from "utils/eras";
import { buildUrl } from "utils/civil";
import { getAppState, AppStateChange } from "app-state";
import {
    svgBlank,
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgPointAdd,
    svgTickedCheckBox,
    svgUntickedCheckBox,
    svgX,
} from "components/svg-icons";
import WhenVerbose from "components/when-verbose";

import CivilInput from "components/civil-input";
import DeckListingPage from "components/deck-listing-page";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import InsigniaSelector from "components/insignias/selector";
import LifespanForm from "components/lifespan-form";
import PointForm from "components/point-form";
import RollableSegment from "components/rollable-segment";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";
import SegmentSearchResults from "components/segment-search-results";
import TopMatter from "components/top-matter";
import useDeckManager from "components/use-deck-manager";
import { SlimDeckGrouping } from "components/groupings";

function People({ path }: { path?: string }) {
    const appState = getAppState();

    useEffect(() => {
        if (!appState.listing.value.people) {
            let url: string = "/api/people/listings";
            Net.get<PeopleListings>(url).then((listings) => {
                AppStateChange.setPeopleListings(listings);
            });
        }
    }, []);

    const people = appState.listing.value.people;

    if (people) {
        return (
            <DeckListingPage deckKind={DeckKind.Article}>
                <SlimDeckGrouping
                    label="Uncategorised"
                    list={people.uncategorised}
                    expanded
                    hideEmpty
                />
                <SlimDeckGrouping
                    label="Ancient"
                    list={people.ancient}
                    expanded
                />
                <SlimDeckGrouping
                    label="Medieval"
                    list={people.medieval}
                    expanded
                />
                <SlimDeckGrouping
                    label="Modern"
                    list={people.modern}
                    expanded
                />
                <SlimDeckGrouping
                    label="Contemporary"
                    list={people.contemporary}
                    expanded
                />
            </DeckListingPage>
        );
    } else {
        return <div></div>;
    }
}

function Person({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const [searchResults, setSearchResults]: [Array<SlimDeck>, Function] =
        useState([]); // an array of backrefs

    let flags = DeckManagerFlags.Summary;
    const deckManager: DM<DeckPerson> = useDeckManager(
        id,
        DeckKind.Person,
        flags,
        preCacheFn
    );

    useEffect(() => {
        Net.get<SearchResults>(`/api/people/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    function dispatchUpdatedPerson(person: DeckPerson) {
        deckManager.update(person);
        Net.get<PeopleListings>("/api/people/listings").then((people) => {
            AppStateChange.setPeopleListings(people);
        });
    }

    function onLifespan(
        deckId: Key,
        birthPoint: ProtoPoint,
        deathPoint?: ProtoPoint
    ) {
        Net.post<ProtoPoint, DeckPerson>(
            `/api/people/${deckId}/points`,
            birthPoint
        ).then((person) => {
            if (deathPoint) {
                Net.post<ProtoPoint, DeckPerson>(
                    `/api/people/${deckId}/points`,
                    deathPoint
                ).then((person) => {
                    dispatchUpdatedPerson(person);
                });
            } else {
                dispatchUpdatedPerson(person);
            }
        });
    }

    function hasBirthPoint(person: DeckPerson) {
        function hasBirth(point: DeckPoint) {
            return point.title === "Born" && point.deckId === person.id;
        }

        if (person.points) {
            return person.points.find(hasBirth);
        }
        return false;
    }

    const deck: DeckPerson | undefined = deckManager.getDeck();
    if (deck) {
        const title = deck && deck.title;
        const hasKnownLifespan = deck && hasBirthPoint(deck);
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    onRefsToggle={deckManager.onRefsToggle}
                    onFormToggle={deckManager.onFormToggle}
                ></TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <div>
                        <DeleteDeckConfirmation
                            deckKind={deckManager.getDeckKind()}
                            id={deck.id}
                        />
                        <button onClick={deckManager.onShowSummaryClicked}>
                            Show Summary Passage
                        </button>
                        <PersonUpdater
                            person={deck}
                            onUpdate={deckManager.updateAndReset}
                            onCancel={deckManager.onFormHide}
                        />
                    </div>
                )}

                {title && !hasKnownLifespan && (
                    <LifespanForm
                        deckId={deck.id}
                        title={title}
                        onLifespanGiven={onLifespan}
                        oldestAliveAge={appState.oldestAliveAge}
                    />
                )}

                <SegmentDeckRefs
                    deck={deck}
                    isEditing={deckManager.isEditingDeckRefs()}
                    onRefsChanged={deckManager.onRefsChanged}
                    onRefsToggle={deckManager.onRefsToggle}
                />

                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckManager.getDeckKind()}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onUpdateDeck={deckManager.update}
                />

                <SegmentBackRefs deck={deck} />

                <SegmentSearchResults searchResults={searchResults} />
                {hasKnownLifespan && (
                    <SegmentPoints
                        deckPoints={deck.points}
                        deckManager={deckManager}
                        holderId={deck.id}
                        showAddPointForm={appState.showAddPointForm.value}
                        holderTitle={deck.title}
                    />
                )}
                <SegmentGraph depth={2} deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person: DeckPerson): DeckPerson {
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

function PersonUpdater({
    person,
    onUpdate,
    onCancel,
}: {
    person: DeckPerson;
    onUpdate: (p: DeckPerson) => void;
    onCancel: () => void;
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

    function handleContentChange(content: string) {
        setLocalState({
            ...localState,
            title: content,
        });
    }

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
                onContentChange={handleContentChange}
            />
            <br />

            <InsigniaSelector
                insigniaId={localState.insigniaId}
                onChange={setInsigniaId}
            />
            <br />
            <input
                type="button"
                value="Cancel"
                class="dialog-cancel"
                onClick={onCancel}
            />
            <input type="submit" value="Update Person" />
        </form>
    );
}

function PersonDeckPoint({
    deckPoint,
    hasNotes,
    passage,
    holderId,
}: {
    deckPoint: DeckPoint;
    hasNotes: boolean;
    passage: PassageType;
    holderId: Key;
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
                {expanded && <div class="point-notes">{passage}</div>}
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

function SegmentPoints({
    deckPoints,
    deckManager,
    holderId,
    holderTitle,
    showAddPointForm,
}: {
    deckPoints: Array<DeckPoint> | undefined;
    deckManager: DM<DeckPerson>;
    holderId: Key;
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
            passage={deckManager.passageForDeckPoint(dp)}
            hasNotes={deckManager.pointHasNotes(dp)}
            holderId={holderId}
            deckPoint={dp}
        />
    ));

    const formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for ${holderTitle}`;
    const hasDied =
        deckPoints &&
        deckPoints.some(
            (dp) => dp.deckId === holderId && dp.kind === PointKind.PointEnd
        );

    const segmentTitle = `Points during the life of ${holderTitle}`;
    return (
        <RollableSegment heading={segmentTitle}>
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
        </RollableSegment>
    );
}

export { Person, People };
