import { useState } from "preact/hooks";

import {
    DeckKind,
    DeckManagerFlags,
    PointKind,
    RenderingDeckPart,
} from "../enums";
import type {
    DeckPerson,
    DM,
    Key,
    PassageType,
    Point,
    ProtoPoint,
    SlimDeck,
} from "../types";

import { AppStateChange, getAppState, immutableState } from "../app-state";

import { fontClass } from "../shared/font";
import Net from "../shared/net";
import { calcAgeInYears, dateStringAsTriple } from "../shared/time";
import { slimDeckFromPoint } from "../shared/deck";

import CivilButton from "./civil-button";
import CivilButtonCreateDeck from "./civil-button-create-deck";
import { CivContainer, CivLeft, CivMain } from "./civil-layout";
import CivilTabButton from "./civil-tab-button";
import DeckLink from "./deck-link";
import DeckUpdater from "./deck-updater";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import { HeadedSegment } from "./headed-segment";
import LifespanForm from "./lifespan-form";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";
import PointForm from "./point-form";
import RecentlyVisited from "./recently-visited";
import RollableSegment from "./rollable-segment";
import SegmentArrivals from "./segment-arrivals";
import SegmentDeckRefs from "./segment-deck-refs";
import SegmentGraph from "./segment-graph";
import SegmentHits from "./segment-hits";
import SegmentInsignias from "./segment-insignias";
import SegmentNotes from "./segment-notes";
import SegmentSearchResults from "./segment-search-results";
import {
    svgBlank,
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgPointAdd,
    svgTickedCheckBox,
    svgUntickedCheckBox,
    svgX,
} from "./svg-icons";
import TopMatter from "./top-matter";
import useDeckManager from "./use-deck-manager";
import WhenEditMode from "./when-edit-mode";

function People({ path }: { path?: string }) {
    return (
        <div>
            <PeopleModule />
            <RecentlyVisited deckKind={DeckKind.Person} numRecent={30} />
            <SegmentInsignias deckKind={DeckKind.Person} />
        </div>
    );
}

function PeopleModule() {
    const [selected, setSelected] = useState("ancient");

    return (
        <HeadedSegment
            extraClasses="c-people-module"
            heading="People"
            extraHeadingClasses="margin-top-0"
        >
            <PeopleSelector setSelected={setSelected} selected={selected} />
            <PeoplePaginator selected={selected} />
        </HeadedSegment>
    );
}

function PeopleSelector({
    selected,
    setSelected,
}: {
    selected: string;
    setSelected: (s: string) => void;
}) {
    function onClicked(s: string) {
        setSelected(s);
    }

    function selectedCheck(h: string) {
        if (h === selected) {
            return "pigment-people selected";
        } else {
            return "";
        }
    }

    const headings: Array<string> = [
        "ancient",
        "medieval",
        "modern",
        "contemporary",
        "uncategorised",
    ];

    return (
        <div class="c-ideas-selector pagination-top-selector">
            {headings.map((heading) => (
                <div class="paginator-item">
                    <CivilTabButton
                        extraClasses={selectedCheck(heading)}
                        onClick={() => {
                            onClicked(heading);
                        }}
                    >
                        {heading}
                    </CivilTabButton>
                </div>
            ))}
        </div>
    );
}

function PeoplePaginator({ selected }: { selected: string }) {
    const url = `/api/people/${selected}`;

    const lowerContent = (
        <CivilButtonCreateDeck
            deckKind={DeckKind.Person}
        ></CivilButtonCreateDeck>
    );

    return (
        <Pagination
            url={url}
            renderItem={listItemSlimDeck}
            itemsPerPage={10}
            lowerContent={lowerContent}
        />
    );
}

function Person({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    let flags = DeckManagerFlags.Summary;
    const deckManager: DM<DeckPerson> = useDeckManager(
        id,
        DeckKind.Person,
        flags,
        preCacheFn,
    );

    function dispatchUpdatedPerson(person: DeckPerson) {
        deckManager.update(person);
    }

    function onLifespan(
        deckId: Key,
        birthPoint: ProtoPoint,
        deathPoint?: ProtoPoint,
    ) {
        Net.post<ProtoPoint, DeckPerson>(
            `/api/people/${deckId}/points`,
            birthPoint,
        ).then((person) => {
            if (deathPoint) {
                Net.post<ProtoPoint, DeckPerson>(
                    `/api/people/${deckId}/points`,
                    deathPoint,
                ).then((person) => {
                    dispatchUpdatedPerson(person);
                });
            } else {
                dispatchUpdatedPerson(person);
            }
        });
    }

    function hasBirthPoint(person: DeckPerson) {
        function hasBirth(point: Point) {
            return point.title === "Born" && point.deckId === person.id;
        }

        if (person.points) {
            // refactor todo
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
                    displayHits={deckManager.displayHits()}
                    setDisplayHits={deckManager.setDisplayHits}
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
                            <DeckUpdater
                                deck={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={() =>
                                    deckManager.setShowingUpdateForm(false)
                                }
                            />
                        </CivContainer>
                    </section>
                )}

                {title && !hasKnownLifespan && (
                    <CivContainer>
                        <CivMain>
                            <LifespanForm
                                deckId={deck.id}
                                title={title}
                                onLifespanGiven={onLifespan}
                                oldestAliveAge={immutableState.oldestAliveAge}
                            />
                        </CivMain>
                    </CivContainer>
                )}

                <SegmentDeckRefs
                    deck={deck}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                    onRefsChanged={deckManager.onRefsChanged}
                />

                <SegmentHits
                    displayHits={deckManager.displayHits()}
                    deck={deck}
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

                <SegmentArrivals deck={deck} />

                <SegmentSearchResults slimdeck={deck as SlimDeck} />
                {hasKnownLifespan && (
                    <SegmentPersonPoints
                        person={deck}
                        deckManager={deckManager}
                        showAddPointForm={appState.showAddPointForm.value}
                    />
                )}
                <SegmentGraph deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

// called before this deck is cached by the AppState (ie after every modification)
function preCacheFn(person: DeckPerson): DeckPerson {
    function getBirthDateFromPoints(points: Array<Point>) {
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

    function calcCompDate(date: string): Date {
        let tri = dateStringAsTriple(date);
        let compDate = new Date();
        compDate.setFullYear(tri[0], tri[1] - 1, tri[2]);
        return compDate;
    }

    if (person.points) {
        let born: [number, number, number] | undefined = getBirthDateFromPoints(
            person.points,
        );
        person.points.forEach((p) => {
            if (p.date) {
                p.compDate = calcCompDate(p.date);
                if (born) {
                    p.age = calcAge(p.date, born);
                }
            }
        });
    }

    return person;
}

function PersonPoint({
    point,
    hasNotes,
    passage,
    deckId,
}: {
    point: Point;
    hasNotes: boolean;
    passage: PassageType;
    deckId: Key;
}) {
    let [expanded, setExpanded] = useState(false);

    let ageText = point.age! > 0 ? `${point.age}` : "";

    if (point.deckId === deckId) {
        function onClicked(e: Event) {
            e.preventDefault();
            setExpanded(!expanded);
        }

        let klass = fontClass(point.font, RenderingDeckPart.Heading);
        klass += " relevent-point";

        let pointText = `${point.title} ${point.dateTextual}`;
        if (point.locationTextual) {
            pointText += ` ${point.locationTextual}`;
        }

        return (
            <li class={klass}>
                <span class="point-age">{ageText}</span>
                <span onClick={onClicked}>
                    {expanded
                        ? svgCaretDown()
                        : hasNotes
                        ? svgCaretRight()
                        : svgCaretRightEmpty()}
                </span>
                {point.deckTitle} - {pointText}
                {expanded && <div class="point-notes">{passage}</div>}
            </li>
        );
    } else {
        return (
            <li class="point">
                <DeckLink slimDeck={slimDeckFromPoint(point)}>
                    <span class="point-age">{ageText}</span>
                    {svgBlank()}
                </DeckLink>
            </li>
        );
    }
}

function SegmentPersonPoints({
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

    function onAddDeathPoint(point: ProtoPoint) {
        Net.post<ProtoPoint, DeckPerson>(
            `/api/people/${deckId}/points`,
            point,
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
                !(e.title === "Born" || e.title === "Died"),
        );
    }

    // don't show the person's age for any of their posthumous points
    const deathIndex = filteredPoints.findIndex(
        (e) => e.deckId === deckId && e.kind === PointKind.PointEnd,
    );
    if (deathIndex) {
        for (let i = deathIndex + 1; i < filteredPoints.length; i++) {
            if (filteredPoints[i]!.deckId === deckId) {
                filteredPoints[i]!.age = 0;
            }
        }
    }

    const dps: Array<any> = filteredPoints.map((dp) => (
        <PersonPoint
            key={dp.id}
            passage={deckManager.passageForPoint(dp)}
            hasNotes={deckManager.pointHasNotes(dp)}
            deckId={deckId}
            point={dp}
        />
    ));

    const formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for ${deckTitle}`;
    const hasDied =
        person.points &&
        person.points.some(
            (dp) => dp.deckId === deckId && dp.kind === PointKind.PointEnd,
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

export { People, Person };
