import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckKind,
    DeckManagerType,
    DeckPoint,
    DeckTimeline,
    DeckSimple,
    NoteManagerType,
} from "../types";

import Net from "../Net";
import { capitalise } from "../JsUtils";
import { getAppState, AppStateChange } from "../AppState";
import {
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgPointAdd,
    svgX,
} from "../svgIcons";

import CivilInput from "./CivilInput";
import DeckManager from "./DeckManager";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import RollableSection from "./RollableSection";
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionGraph from "./SectionGraph";
import SectionNotes from "./SectionNotes";
import TopMatter from "./TopMatter";
import WhenVerbose from "./WhenVerbose";
import { DeckSimpleList } from "./ListSections";
import { DeluxeToolbar } from "./DeluxeToolbar";
import { InsigniaSelector } from "./Insignias";

function Timelines({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "timelines";

    useEffect(() => {
        if (!appState.listing.value.timelines) {
            let url: string = "/api/timelines/listings";
            Net.get<Array<DeckSimple>>(url).then((listing) => {
                AppStateChange.setTimelineListing(listing);
            });
        }
    }, []);

    let timelines = appState.listing.value.timelines;
    return (
        <article>
            <h1 class="ui">{capitalise(resource)}</h1>
            {timelines && <DeckSimpleList list={timelines} />}
        </article>
    );
}

function Timeline({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const timelineId = id ? parseInt(id, 10) : 0;
    const resource: DeckKind = DeckKind.Timeline;

    const deckManager = DeckManager({
        id: timelineId,
        resource,
        hasSummarySection: true,
        hasReviewSection: false,
    });

    const deck: DeckTimeline | undefined = deckManager.getDeck() as
        | DeckTimeline
        | undefined;
    if (deck) {
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
                            resource={DeckKind.Timeline}
                            id={timelineId}
                        />
                        <SectionUpdateTimeline
                            timeline={deck}
                            onUpdate={deckManager.updateAndReset}
                        />
                    </div>
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
                    resource={resource}
                    howToShowNoteSection={deckManager.howToShowNoteSection}
                    canShowNoteSection={deckManager.canShowNoteSection}
                    onUpdateDeck={deckManager.update}
                />
                <SectionBackRefs deck={deck} />

                <ListPoints
                    points={deck.points}
                    deckManager={deckManager}
                    showAddPointForm={appState.showAddPointForm.value}
                />

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

function SectionUpdateTimeline({ timeline, onUpdate }) {
    const [localState, setLocalState] = useState({
        title: timeline.title || "",
        insigniaId: timeline.insignia || 0,
    });

    useEffect(() => {
        if (
            timeline.title &&
            timeline.title !== "" &&
            localState.title === ""
        ) {
            setLocalState({
                ...localState,
                title: timeline.title,
            });
        }
        if (timeline.insignia) {
            setLocalState({
                ...localState,
                insigniaId: timeline.insignia,
            });
        }
    }, [timeline]);

    const handleChangeEvent = (e: Event) => {
        if (e.target instanceof HTMLInputElement) {
            const target = e.target;
            const name = target.name;
            const value = target.value;

            if (name === "title") {
                setLocalState({
                    ...localState,
                    title: value,
                });
            }
        }
    };

    const handleSubmit = (e: Event) => {
        const data = {
            title: localState.title.trim(),
            insignia: localState.insigniaId,
        };

        // edit an existing timeline
        Net.put(`/api/timelines/${timeline.id}`, data).then((newDeck) => {
            onUpdate(newDeck);
        });

        e.preventDefault();
    };

    const setInsigniaId = (id: number) => {
        setLocalState({
            ...localState,
            insigniaId: id,
        });
    };

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="title">Title:</label>
            <br />
            <CivilInput
                id="title"
                value={localState.title}
                onInput={handleChangeEvent}
            />
            <br />

            <InsigniaSelector
                insigniaId={localState.insigniaId}
                onChange={setInsigniaId}
            />
            <br />

            <input type="submit" value="Update Timeline" />
        </form>
    );
}

function TimelineDeckPoint({
    deckPoint,
    hasNotes,
    noteManager,
}: {
    deckPoint: DeckPoint;
    hasNotes: boolean;
    noteManager: NoteManagerType;
}) {
    let [expanded, setExpanded] = useState(false);

    function onClicked(e: Event) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    return (
        <li class="relevent-deckpoint">
            <span onClick={onClicked}>
                {expanded
                    ? svgCaretDown()
                    : hasNotes
                    ? svgCaretRight()
                    : svgCaretRightEmpty()}
            </span>
            {deckPoint.title} {deckPoint.dateTextual}
            {expanded && <div class="point-notes">{noteManager}</div>}
        </li>
    );
}

function ListPoints({
    points,
    deckManager,
    showAddPointForm,
}: {
    points: Array<DeckPoint> | undefined;
    deckManager: DeckManagerType;
    showAddPointForm: boolean;
}) {
    function onAddPointClicked(e: Event) {
        e.preventDefault();
        showAddPointForm
            ? AppStateChange.hideAddPointForm()
            : AppStateChange.showAddPointForm();
    }

    // called by DeckManager once a point has been successfully created
    function onPointCreated() {
        AppStateChange.hideAddPointForm();
    }

    let arr = points || [];
    let dps = arr.map((dp) => (
        <TimelineDeckPoint
            key={dp.id}
            noteManager={deckManager.noteManagerForDeckPoint(dp)}
            hasNotes={deckManager.pointHasNotes(dp)}
            deckPoint={dp}
        />
    ));

    let formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for { holderName }`;

    return (
        <RollableSection heading="Timeline">
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

export { Timeline, Timelines };
