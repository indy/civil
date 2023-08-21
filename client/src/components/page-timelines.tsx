import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckKind,
    DeckManagerFlags,
    DM,
    Point,
    DeckTimeline,
    Font,
    PassageType,
    DeckUpdate,
} from "types";

import Net from "shared/net";
import { getAppState, AppStateChange, immutableState } from "app-state";
import {
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
    svgPointAdd,
    svgX,
} from "components/svg-icons";

import TopBarMenu from "components/top-bar-menu";
import CivilTabButton from "components/civil-tab-button";
import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilButton from "components/civil-button";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import InsigniaSelector from "components/insignia-selector";
import RollableSegment from "components/rollable-segment";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "components/segment-graph";
import SegmentNotes from "components/segment-notes";
import TopMatter from "components/top-matter";
import FontSelector from "components/font-selector";
import WhenEditMode from "components/when-edit-mode";
import Pagination from "components/pagination";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";
import {
    CivContainer,
    CivMain,
    CivForm,
    CivLeft,
    CivLeftLabel,
} from "components/civil-layout";
import { Module } from "components/module";

function Timelines({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <TimelinesModule />
        </div>
    );
}

function TimelinesModule() {
    const url = `/api/timelines/pagination`;

    const lowerContent = (
        <CivilButtonCreateDeck
            deckKind={DeckKind.Timeline}
        ></CivilButtonCreateDeck>
    );

    function FakeTopSelector() {
        return (
            <div class="c-paginator-top-selector pagination-top-selector">
                <CivilTabButton extraClasses="pigment-timelines selected">
                    All
                </CivilTabButton>
            </div>
        );
    }

    return (
        <Module
            extraClasses="c-timelines-module"
            heading="Timelines"
            extraHeadingClasses="margin-top-0"
        >
            <FakeTopSelector />
            <Pagination
                url={url}
                renderItem={renderPaginatedSlimDeck}
                itemsPerPage={10}
                lowerContent={lowerContent}
            />
        </Module>
    );
}

function Timeline({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    let flags = DeckManagerFlags.Summary;
    const deckManager: DM<DeckTimeline> = useDeckManager(
        id,
        DeckKind.Timeline,
        flags
    );

    const deck: DeckTimeline | undefined = deckManager.getDeck();
    if (deck) {
        deckManager.complyWithAppStateRequestToShowUpdateForm();
        return (
            <article>
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
                            <TimelineUpdater
                                timeline={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={() =>
                                    deckManager.setShowingUpdateForm(false)
                                }
                            />
                        </CivContainer>
                    </section>
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

                <SegmentPoints
                    points={deck.points}
                    deckManager={deckManager}
                    title={deck.title}
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
        font: timeline.font || Font.Serif,
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
        if (timeline.font) {
            setLocalState({
                ...localState,
                font: timeline.font,
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
        const data: DeckUpdate = {
            title: localState.title.trim(),
            insignia: localState.insigniaId,
            font: localState.font,
            graphTerminator: false,
        };

        // edit an existing timeline
        Net.put<DeckUpdate, DeckTimeline>(
            `/api/timelines/${timeline.id}`,
            data
        ).then((newDeck) => {
            onUpdate(newDeck);
        });

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
            <CivLeftLabel forId="title">Title</CivLeftLabel>

            <CivMain>
                <CivilInput
                    id="title"
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
                    value="Update Timeline"
                />
            </CivMain>
        </CivForm>
    );
}

function TimelinePoint({
    point,
    hasNotes,
    passage,
}: {
    point: Point;
    hasNotes: boolean;
    passage: PassageType;
}) {
    let [expanded, setExpanded] = useState(false);

    function onClicked(e: Event) {
        e.preventDefault();
        setExpanded(!expanded);
    }

    return (
        <li class="relevent-point">
            <span onClick={onClicked}>
                {expanded
                    ? svgCaretDown()
                    : hasNotes
                    ? svgCaretRight()
                    : svgCaretRightEmpty()}
            </span>
            {point.title} {point.dateTextual}
            {expanded && <div class="point-notes">{passage}</div>}
        </li>
    );
}

function SegmentPoints({
    points,
    title,
    deckManager,
    showAddPointForm,
}: {
    points: Array<Point> | undefined;
    title: string;
    deckManager: DM<DeckTimeline>;
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
        <TimelinePoint
            key={dp.id}
            passage={deckManager.passageForPoint(dp)}
            hasNotes={deckManager.pointHasNotes(dp)}
            point={dp}
        />
    ));

    let formSidebarText = showAddPointForm
        ? "Hide Form"
        : `Add Point for ${title}`;

    const deck = deckManager.getDeck();
    const font = deck ? deck.font : immutableState.defaultFont;

    return (
        <RollableSegment heading="Timeline" font={font}>
            <CivContainer>
                <CivMain>
                    <ul class="unstyled-list hug-left">{dps}</ul>
                </CivMain>
                <WhenEditMode>
                    <CivLeft>
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
                </WhenEditMode>
                {showAddPointForm && deckManager.buildPointForm(onPointCreated)}
            </CivContainer>
        </RollableSegment>
    );
}

export { Timeline, Timelines, TimelinesModule };
