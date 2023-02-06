import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { IDeckSimple } from "../types";

import Net from "../Net";
import { getAppState, AppStateChange } from "../AppState";
import { capitalise } from "../JsUtils";
import { deckTitle } from "../CivilUtils";

import CivilInput from "./CivilInput";
import DeckManager from "./DeckManager";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import { InsigniaSelector } from "./Insignias";
import RollableSection from "./RollableSection";
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionGraph from "./SectionGraph";
import SectionNotes from "./SectionNotes";
import TopMatter from "./TopMatter";
import WhenVerbose from "./WhenVerbose";
import { DeckSimpleList } from "./ListSections";
import { DeluxeToolbar } from "./DeluxeToolbar";
import {
    svgPointAdd,
    svgX,
    svgCaretRight,
    svgCaretRightEmpty,
    svgCaretDown,
} from "../svgIcons";

function Timelines({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "timelines";

    useEffect(() => {
        if (!appState.listing.value.articles) {
            let url: string = "/api/timelines/listings";
            Net.get<Array<IDeckSimple>>(url).then((listing) => {
                AppStateChange.setTimelineListing(listing);
            });
        }
    }, []);

    return (
        <article>
            <h1 class="ui">{capitalise(resource)}</h1>
            <DeckSimpleList list={appState.listing.value.timelines} />
        </article>
    );
}

function Timeline({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const timelineId = id ? parseInt(id, 10) : 0;
    const resource = "timelines";

    const deckManager = DeckManager({
        id: timelineId,
        resource,
        hasSummarySection: true,
        hasReviewSection: false,
    });

    let deck: any = deckManager.getDeck();

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
                    <DeleteDeckConfirmation
                        resource="timelines"
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
                title={deckTitle(deck)}
                onRefsChanged={deckManager.onRefsChanged}
                resource="timelines"
                howToShowNoteSection={deckManager.howToShowNoteSection}
                canShowNoteSection={deckManager.canShowNoteSection}
                onUpdateDeck={deckManager.update}
            />
            <SectionBackRefs deck={deck} />
            {!!deck && (
                <ListPoints
                    points={deck.points}
                    deckManager={deckManager}
                    showAddPointForm={appState.showAddPointForm.value}
                    holderId={deck.id}
                    holderName={deck.title}
                />
            )}

            <SectionGraph depth={2} deck={deck} />
        </article>
    );
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

    const setInsigniaId = (id?: any) => {
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
    holderId,
    holderName,
    showAddPointForm,
}: {
    points?: any;
    deckManager?: any;
    holderId?: any;
    holderName?: any;
    showAddPointForm?: any;
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
            holderId={holderId}
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
