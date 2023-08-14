import { h } from "preact";
import { Link } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import {
    Font,
    DeckKind,
    DeckManagerFlags,
    DM,
    DeckPerson,
    DeckPoint,
    DeckUpdate,
    Key,
    SlimDeck,
    PeopleListings,
    ResultList,
    PassageType,
    PointKind,
    ProtoPoint,
    RenderingDeckPart,
    SlimEvent,
} from "types";

import Net from "shared/net";
import { calcAgeInYears, dateStringAsTriple } from "shared/time";
import { buildUrl } from "shared/civil";
import { deckKindToHeadingString } from "shared/deck";
import { fontClass } from "shared/font";
import { getAppState, AppStateChange, immutableState } from "app-state";
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
import WhenEditMode from "components/when-edit-mode";

import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilButton from "components/civil-button";
import CivilInput from "components/civil-input";
import Module from "components/module";
import DeckLink from "components/deck-link";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import InsigniaSelector from "components/insignia-selector";
import LifespanForm from "components/lifespan-form";
import PointForm from "components/point-form";
import RollableSegment from "components/rollable-segment";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "components/segment-graph";
import SegmentNotes from "components/segment-notes";
import SegmentSearchResults from "components/segment-search-results";
import TopMatter from "components/top-matter";
import FontSelector from "components/font-selector";
import useDeckManager from "components/use-deck-manager";
import { SlimDeckGrouping } from "components/groupings";
import {
    CivContainer,
    CivMain,
    CivForm,
    CivLeft,
    CivLeftLabel,
} from "components/civil-layout";

function People({ path }: { path?: string }) {
    const appState = getAppState();

    useEffect(() => {
        if (!appState.listing.value.people) {
            let url: string = "/api/people/listings";
            Net.get<PeopleListings>(url).then((listings) => {
                AppStateChange.setPeopleListings({ peopleListings: listings });
            });
        }
    }, []);

    const people = appState.listing.value.people;
    return people ? <PeopleModule people={people} /> : <div />;
}

function PeopleModule({ people }: { people: PeopleListings }) {
    let buttons = (
        <CivilButtonCreateDeck
            deckKind={DeckKind.Person}
        ></CivilButtonCreateDeck>
    );

    return (
        <Module
            heading={deckKindToHeadingString(DeckKind.Person)}
            buttons={buttons}
        >
            <SlimDeckGrouping
                label="Uncategorised"
                list={people.uncategorised}
                expanded
                hideEmpty
            />
            <SlimDeckGrouping label="Ancient" list={people.ancient} expanded />
            <SlimDeckGrouping
                label="Medieval"
                list={people.medieval}
                expanded
            />
            <SlimDeckGrouping label="Modern" list={people.modern} expanded />
            <SlimDeckGrouping
                label="Contemporary"
                list={people.contemporary}
                expanded
            />
        </Module>
    );
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
        Net.get<ResultList>(`/api/people/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    function dispatchUpdatedPerson(person: DeckPerson) {
        deckManager.update(person);
        Net.get<PeopleListings>("/api/people/listings").then((people) => {
            AppStateChange.setPeopleListings({ peopleListings: people });
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
        deckManager.complyWithAppStateRequestToShowUpdateForm();
        const title = deck && deck.title;
        const hasKnownLifespan = deck && hasBirthPoint(deck);
        return (
            <article class="c-person">
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    setShowingUpdateForm={deckManager.setShowingUpdateForm}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                ></TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <section>
                        <CivContainer>
                            <CivMain>
                                <DeleteDeckConfirmation
                                    deckKind={deckManager.getDeckKind()}
                                    id={deck.id}
                                />
                                <CivilButton
                                    onClick={deckManager.onShowSummaryClicked}
                                >
                                    Show Summary Passage
                                </CivilButton>
                            </CivMain>
                        </CivContainer>
                        <div class="vertical-spacer"></div>
                        <CivContainer>
                            <PersonUpdater
                                person={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={() =>
                                    deckManager.setShowingUpdateForm(false)
                                }
                            />
                        </CivContainer>
                    </section>
                )}

                {title && !hasKnownLifespan && (
                    <LifespanForm
                        deckId={deck.id}
                        title={title}
                        onLifespanGiven={onLifespan}
                        oldestAliveAge={immutableState.oldestAliveAge}
                    />
                )}

                <SegmentDeckRefs
                    deck={deck}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                    onRefsChanged={deckManager.onRefsChanged}
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

                <SegmentSearchResults
                    font={deck.font}
                    searchResults={searchResults}
                />
                {hasKnownLifespan && (
                    <SegmentPoints
                        person={deck}
                        deckManager={deckManager}
                        showAddPointForm={appState.showAddPointForm.value}
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

    function calcAge(date: string, born: [number, number, number]) {
        let eventTriple: [number, number, number] = dateStringAsTriple(date);
        let years = calcAgeInYears(eventTriple, born);
        return years;
    }

    // point is an element in points
    function addAgeToPoint(
        point: DeckPoint,
        born: [number, number, number]
    ): DeckPoint {
        if (point.date) {
            point.age = calcAge(point.date, born);
        }
        return point;
    }
    function addAgeToEvent(
        ev: SlimEvent,
        born: [number, number, number]
    ): SlimEvent {
        if (ev.date) {
            ev.age = calcAge(ev.date, born);
        }
        return ev;
    }

    if (person.points && person.events) {
        let born: [number, number, number] | undefined = getBirthDateFromPoints(
            person.points
        );
        if (born) {
            let b: [number, number, number] = born;
            // we have a birth year so we can add the age of the person to each of the points elements
            person.points.forEach((p) => addAgeToPoint(p, b));
            person.events.forEach((ev) => addAgeToEvent(ev, b));
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
        font: person.font || Font.Serif,
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

        if (person.font) {
            setLocalState({
                ...localState,
                font: person.font,
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
        const data: DeckUpdate = {
            title: localState.title.trim(),
            insignia: localState.insigniaId,
            font: localState.font,
            graphTerminator: false,
        };

        // edit an existing person
        Net.put<DeckUpdate, DeckPerson>(`/api/people/${person.id}`, data).then(
            (newDeck) => {
                onUpdate(newDeck);
            }
        );

        e.preventDefault();
    };

    function setInsigniaId(id: number) {
        setLocalState({
            ...localState,
            insigniaId: id,
        });
    }

    function setFont(font: Font) {
        setLocalState({
            ...localState,
            font,
        });
    }

    return (
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="name">Name</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="name"
                    value={localState.title}
                    onContentChange={handleContentChange}
                />
            </CivMain>

            <CivLeftLabel extraClasses="icon-left-label">
                Insignias
            </CivLeftLabel>
            <CivMain>
                <InsigniaSelector
                    insigniaId={localState.insigniaId}
                    onChange={setInsigniaId}
                />
            </CivMain>

            <CivLeftLabel>Font</CivLeftLabel>
            <CivMain>
                <FontSelector font={localState.font} onChangedFont={setFont} />
            </CivMain>

            <CivMain>
                <CivilButton extraClasses="dialog-cancel" onClick={onCancel}>
                    Cancel
                </CivilButton>
                <input
                    class="c-civil-button"
                    type="submit"
                    value="Update Person"
                />
            </CivMain>
        </CivForm>
    );
}

// display an event within a person's timeline
//
function PersonSlimEvent({ event }: { event: SlimEvent }) {
    let ageText = event.age! > 0 ? `${event.age}` : "";
    let klass = fontClass(event.font, RenderingDeckPart.Heading);

    return (
        <li class={klass}>
            <span class="deckpoint-age">{ageText}</span>
            <span>{svgBlank()}</span>
            <DeckLink slimDeck={event} />
        </li>
    );
}

function PersonDeckPoint({
    deckPoint,
    hasNotes,
    passage,
    deckId,
}: {
    deckPoint: DeckPoint;
    hasNotes: boolean;
    passage: PassageType;
    deckId: Key;
}) {
    let [expanded, setExpanded] = useState(false);

    function onClicked(e: Event) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    let ageText = deckPoint.age! > 0 ? `${deckPoint.age}` : "";
    let klass = fontClass(deckPoint.font, RenderingDeckPart.Heading);

    let pointText = `${deckPoint.title} ${deckPoint.dateTextual}`;
    if (deckPoint.locationTextual) {
        pointText += ` ${deckPoint.locationTextual}`;
    }

    if (deckPoint.deckId === deckId) {
        klass += " relevent-deckpoint";
        return (
            <li class={klass}>
                <span class="deckpoint-age">{ageText}</span>
                <span onClick={onClicked}>
                    {expanded
                        ? svgCaretDown()
                        : hasNotes
                        ? svgCaretRight()
                        : svgCaretRightEmpty()}
                </span>
                {deckPoint.deckName} - {pointText}
                {expanded && <div class="point-notes">{passage}</div>}
            </li>
        );
    } else {
        klass += " deckpoint";
        return (
            <li class={klass}>
                <Link href={buildUrl(deckPoint.deckKind, deckPoint.deckId)}>
                    <span class="deckpoint-age">{ageText}</span>
                    {svgBlank()}
                    {deckPoint.deckName} - {pointText}
                </Link>
            </li>
        );
    }
}

function SegmentPoints({
    person,
    deckManager,
    showAddPointForm,
}: {
    person: DeckPerson;
    deckManager: DM<DeckPerson>;
    showAddPointForm: boolean;
}) {
    const deckId = person.id;
    const deckTitle = person.title;
    const font = person.font;

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
            `/api/people/${deckId}/points`,
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

    let filteredPoints = person.points || [];
    if (onlyThisPerson) {
        filteredPoints = filteredPoints.filter((e) => e.deckId === deckId);
    }
    if (!showBirthsDeaths) {
        filteredPoints = filteredPoints.filter(
            (e) =>
                e.deckId === deckId ||
                !(e.title === "Born" || e.title === "Died")
        );
    }

    // don't show the person's age for any of their posthumous points
    const deathIndex = filteredPoints.findIndex(
        (e) => e.deckId === deckId && e.kind === PointKind.PointEnd
    );
    if (deathIndex) {
        for (let i = deathIndex + 1; i < filteredPoints.length; i++) {
            if (filteredPoints[i].deckId === deckId) {
                filteredPoints[i].age = 0;
            }
        }
    }

    let filteredEvents = person.events || [];
    if (onlyThisPerson) {
        filteredEvents = [];
    }

    // points and events should be rendered in chronological order
    const dps: Array<any> = [];
    while (true) {
        if (filteredPoints.length === 0) {
            break;
        }
        if (filteredEvents.length === 0) {
            break;
        }

        if (filteredPoints[0].date! < filteredEvents[0].date!) {
            let dp = filteredPoints[0];
            dps.push(
                <PersonDeckPoint
                    key={dp.id}
                    passage={deckManager.passageForDeckPoint(dp)}
                    hasNotes={deckManager.pointHasNotes(dp)}
                    deckId={deckId}
                    deckPoint={dp}
                />
            );
            filteredPoints = filteredPoints.slice(1);
        } else {
            dps.push(<PersonSlimEvent event={filteredEvents[0]} />);
            filteredEvents = filteredEvents.slice(1);
        }
    }

    if (filteredPoints.length > 0) {
        filteredPoints.forEach((dp) => {
            dps.push(
                <PersonDeckPoint
                    key={dp.id}
                    passage={deckManager.passageForDeckPoint(dp)}
                    hasNotes={deckManager.pointHasNotes(dp)}
                    deckId={deckId}
                    deckPoint={dp}
                />
            );
        });
    }

    if (filteredEvents.length > 0) {
        filteredEvents.forEach((fe) => {
            dps.push(<PersonSlimEvent event={fe} />);
        });
    }

    const formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for ${deckTitle}`;
    const hasDied =
        person.points &&
        person.points.some(
            (dp) => dp.deckId === deckId && dp.kind === PointKind.PointEnd
        );

    const segmentTitle = `Points during the life of ${deckTitle}`;

    return (
        <RollableSegment
            heading={segmentTitle}
            font={font}
            extraClasses="c-segment-points"
        >
            <CivContainer>
                <CivLeft ui>
                    <WhenEditMode>
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
                    </WhenEditMode>
                    <div
                        class="left-margin-entry fadeable clickable"
                        onClick={onOnlyThisPersonClicked}
                    >
                        <span class="left-margin-icon-label">
                            Only {deckTitle}
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
                </CivLeft>
                <WhenEditMode>{showDeathForm && deathForm()}</WhenEditMode>

                <CivMain>
                    <ul class="unstyled-list hug-left">{dps}</ul>
                </CivMain>
                <WhenEditMode>
                    <CivLeft ui>
                        <div
                            class="left-margin-entry fadeable clickable"
                            onClick={onAddPointClicked}
                        >
                            <span class="left-margin-icon-label">
                                {formSidebarText}
                            </span>
                            {showAddPointForm ? svgX() : svgPointAdd()}
                        </div>
                    </CivLeft>
                    {showAddPointForm &&
                        deckManager.buildPointForm(onPointCreated)}
                </WhenEditMode>
            </CivContainer>
        </RollableSegment>
    );
}

export { Person, People, PeopleModule };
