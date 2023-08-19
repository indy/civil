import { h } from "preact";
import { Link } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import {
    Font,
    DeckKind,
    DeckManagerFlags,
    DM,
    DeckPerson,
    Point,
    DeckUpdate,
    Key,
    SlimDeck,
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

import TopBarMenu from "components/top-bar-menu";
import WhenEditMode from "components/when-edit-mode";
import CivilTabButton from "components/civil-tab-button";
import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilButton from "components/civil-button";
import CivilInput from "components/civil-input";
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
import Pagination from "components/pagination";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";
import {
    CivContainer,
    CivMain,
    CivForm,
    CivLeft,
    CivLeftLabel,
} from "components/civil-layout";

function People({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <PeopleModule />
        </div>
    );
}

function PeopleModule() {
    const [selected, setSelected] = useState("ancient");

    return (
        <article class="c-people-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui margin-top-0">People</h3>
                </CivLeft>
                <CivMain>
                    <PeopleSelector
                        setSelected={setSelected}
                        selected={selected}
                    />
                    <PeoplePaginator selected={selected} />
                </CivMain>
            </CivContainer>
        </article>
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
            renderItem={renderPaginatedSlimDeck}
            itemsPerPage={10}
            lowerContent={lowerContent}
        />
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

    if (person.points && person.events) {
        let born: [number, number, number] | undefined = getBirthDateFromPoints(
            person.points
        );
        person.points.forEach((p) => {
            if (p.date) {
                p.compDate = calcCompDate(p.date);
                if (born) {
                    p.age = calcAge(p.date, born);
                }
            }
        });
        person.events.forEach((e) => {
            if (e.date) {
                e.compDate = calcCompDate(e.date);
                if (born) {
                    e.age = calcAge(e.date, born);
                }
            }
        });
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
            <span class="point-age">{ageText}</span>
            <span>{svgBlank()}</span>
            <DeckLink slimDeck={event} /> <span>{event.dateTextual}</span>
        </li>
    );
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

    function onClicked(e: Event) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    let ageText = point.age! > 0 ? `${point.age}` : "";
    let klass = fontClass(point.font, RenderingDeckPart.Heading);

    let pointText = `${point.title} ${point.dateTextual}`;
    if (point.locationTextual) {
        pointText += ` ${point.locationTextual}`;
    }

    if (point.deckId === deckId) {
        klass += " relevent-point";
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
                {point.deckName} - {pointText}
                {expanded && <div class="point-notes">{passage}</div>}
            </li>
        );
    } else {
        klass += " point";
        return (
            <li class={klass}>
                <Link href={buildUrl(point.deckKind, point.deckId)}>
                    <span class="point-age">{ageText}</span>
                    {svgBlank()}
                    {point.deckName} - {pointText}
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

    function onAddDeathPoint(point: Point) {
        Net.post<Point, DeckPerson>(`/api/people/${deckId}/points`, point).then(
            (_person) => {
                setShowDeathForm(false);
            }
        );
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

        if (filteredPoints[0].compDate < filteredEvents[0].compDate) {
            let dp = filteredPoints[0];
            dps.push(
                <PersonPoint
                    key={dp.id}
                    passage={deckManager.passageForPoint(dp)}
                    hasNotes={deckManager.pointHasNotes(dp)}
                    deckId={deckId}
                    point={dp}
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
                <PersonPoint
                    key={dp.id}
                    passage={deckManager.passageForPoint(dp)}
                    hasNotes={deckManager.pointHasNotes(dp)}
                    deckId={deckId}
                    point={dp}
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
