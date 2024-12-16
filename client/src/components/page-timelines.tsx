import { useEffect, useState } from "preact/hooks";

import { CivilMode, DeckKind, DeckManagerFlags } from "../enums";
import type { DeckTimeline, DM, PassageType, Point, SlimDeck } from "../types";

import { getUrlParamNumber, setUrlParam } from "../shared/url-params";

import { AppStateChange, getAppState, immutableState } from "../app-state";
import CivilButton from "./civil-button";
import CivilButtonCreateDeck from "./civil-button-create-deck";
import { CivContainer, CivMain } from "./civil-layout";
import CivilModeButton from "./civil-mode-button";
import CivilTabButton from "./civil-tab-button";
import DeckUpdater from "./deck-updater";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import { HeadedSegment } from "./headed-segment";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";
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
    svgCaretDown,
    svgCaretRight,
    svgCaretRightEmpty,
} from "./svg-icons";
import TopMatter from "./top-matter";
import useDeckManager from "./use-deck-manager";
import WhenEditMode from "./when-edit-mode";

function Timelines({ path }: { path?: string }) {
    return (
        <div>
            <TimelinesModule />
            <RecentlyVisited deckKind={DeckKind.Timeline} numRecent={30} />
            <SegmentInsignias deckKind={DeckKind.Timeline} />
        </div>
    );
}

function TimelinesModule() {
    const [offset, setOffset] = useState(getUrlParamNumber("timeline-offset", 0));

    useEffect(() => {
        setUrlParam("timeline-offset", `${offset}`);
    }, [offset]);

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
        <HeadedSegment
            extraClasses="c-timelines-module"
            heading="Timelines"
            extraHeadingClasses="margin-top-0"
        >
            <FakeTopSelector />
            <Pagination
                url={url}
                renderItem={listItemSlimDeck}
                offset={offset}
                changedOffset={setOffset}
                itemsPerPage={10}
                lowerContent={lowerContent}
            />
        </HeadedSegment>
    );
}

function Timeline({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    let flags = DeckManagerFlags.Summary;
    const deckManager: DM<DeckTimeline> = useDeckManager(
        id,
        DeckKind.Timeline,
        flags,
    );

    const deck: DeckTimeline | undefined = deckManager.getDeck();
    if (deck) {
        deckManager.complyWithAppStateRequestToShowUpdateForm();
        return (
            <article>
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

                <SegmentPoints
                    points={deck.points}
                    deckManager={deckManager}
                    title={deck.title}
                    showAddPointForm={appState.showAddPointForm.value}
                />

                <SegmentArrivals deck={deck} />

                <SegmentSearchResults slimdeck={deck as SlimDeck} />

                <SegmentGraph deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
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
    function onAddPointClicked() {
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

    let formButtonText = showAddPointForm
        ? "Hide Form"
        : `Add Point for ${title}`;

    const deck = deckManager.getDeck();
    const font = deck ? deck.font : immutableState.defaultFont;

    return (
        <RollableSegment heading="Timeline" font={font}>
            <CivContainer>
                <WhenEditMode>
                    <CivilModeButton
                        mode={CivilMode.Edit}
                        onClick={onAddPointClicked}
                    >
                        {formButtonText}
                    </CivilModeButton>
                    {showAddPointForm && deckManager.buildPointForm(onPointCreated)}
                </WhenEditMode>

                <CivMain>
                    <ul class="unstyled-list hug-left">{dps}</ul>
                </CivMain>
            </CivContainer>
        </RollableSegment>
    );
}

export { Timeline, Timelines };
