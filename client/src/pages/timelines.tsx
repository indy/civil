import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckKind,
    DeckManagerType,
    DeckPoint,
    DeckTimeline,
    SlimDeck,
    PassageType,
} from "types";

import Net from "utils/net";
import { capitalise } from "utils/js";
import { getAppState, AppStateChange } from "app-state";
import {
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgPointAdd,
    svgX,
} from "components/svg-icons";

import CivilInput from "components/civil-input";
import DeckManager from "components/deck-manager";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import InsigniaSelector from "features/insignias/selector";
import RollableSegment from "components/rollable-segment";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "features/graph/segment-graph";
import SegmentNotes from "features/notes/segment-notes";
import TopMatter from "components/top-matter";
import WhenVerbose from "components/when-verbose";
import { SlimDeckList } from "components/groupings";

function Timelines({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "timelines";

    useEffect(() => {
        if (!appState.listing.value.timelines) {
            let url: string = "/api/timelines/listings";
            Net.get<Array<SlimDeck>>(url).then((listings) => {
                AppStateChange.setTimelineListings(listings);
            });
        }
    }, []);

    let timelines = appState.listing.value.timelines;
    return (
        <article>
            <h1 class="ui">{capitalise(resource)}</h1>
            {timelines && <SlimDeckList list={timelines} />}
        </article>
    );
}

function Timeline({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const timelineId = id ? parseInt(id, 10) : 0;
    const deckKind: DeckKind = DeckKind.Timeline;

    const deckManager = DeckManager({
        id: timelineId,
        deckKind,
        hasSummaryPassage: true,
        hasReviewPassage: false,
    });

    const deck: DeckTimeline | undefined = deckManager.getDeck() as
        | DeckTimeline
        | undefined;
    if (deck) {
        return (
            <article>
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
                            deckKind={DeckKind.Timeline}
                            id={timelineId}
                        />
                        <TimelineUpdater
                            timeline={deck}
                            onUpdate={deckManager.updateAndReset}
                            onCancel={deckManager.onFormHide}
                        />
                    </div>
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
                    deckKind={deckKind}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onUpdateDeck={deckManager.update}
                />
                <SegmentBackRefs deck={deck} />

                <SegmentPoints
                    points={deck.points}
                    deckManager={deckManager}
                    showAddPointForm={appState.showAddPointForm.value}
                />

                <SegmentGraph depth={2} deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

type TimelineUpdaterProps = {
    timeline: DeckTimeline;
    onUpdate: (d: DeckTimeline) => void;
    onCancel: () => void;
};

function TimelineUpdater({
    timeline,
    onUpdate,
    onCancel,
}: TimelineUpdaterProps) {
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

    function handleContentChange(content: string) {
        setLocalState({
            ...localState,
            title: content,
        });
    }

    const handleSubmit = (e: Event) => {
        type SubmitData = {
            title: string;
            insignia: number;
        };

        const data: SubmitData = {
            title: localState.title.trim(),
            insignia: localState.insigniaId,
        };

        // edit an existing timeline
        Net.put<SubmitData, DeckTimeline>(
            `/api/timelines/${timeline.id}`,
            data
        ).then((newDeck) => {
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
            <input type="submit" value="Update Timeline" />
        </form>
    );
}

function TimelineDeckPoint({
    deckPoint,
    hasNotes,
    passage,
}: {
    deckPoint: DeckPoint;
    hasNotes: boolean;
    passage: PassageType;
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
            {expanded && <div class="point-notes">{passage}</div>}
        </li>
    );
}

function SegmentPoints({
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
            passage={deckManager.passageForDeckPoint(dp)}
            hasNotes={deckManager.pointHasNotes(dp)}
            deckPoint={dp}
        />
    ));

    let formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for { holderName }`;

    return (
        <RollableSegment heading="Timeline">
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

export { Timeline, Timelines };
