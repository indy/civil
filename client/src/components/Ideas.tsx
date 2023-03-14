import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckIdea,
    DeckKind,
    SlimDeck,
    IdeasListings,
    SearchResults,
} from "../types";

import Net from "../Net";
import { capitalise, formattedDate } from "../JsUtils";
import { getAppState, AppStateChange } from "../AppState";

import CivilInput from "./CivilInput";
import DeckManager from "./DeckManager";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import LeftMarginHeading from "./LeftMarginHeading";
import SegmentBackRefs from "./SegmentBackRefs";
import SegmentDeckRefs from "./SegmentDeckRefs";
import SegmentGraph from "./SegmentGraph";
import SegmentNotes from "./SegmentNotes";
import SegmentSearchResults from "./SegmentSearchResults";
import TopMatter from "./TopMatter";
import { InsigniaSelector } from "./Insignias";
import { SlimDeckGrouping } from "./Groupings";

function Ideas({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "ideas";

    useEffect(() => {
        if (!appState.listing.value.ideas) {
            let url: string = "/api/ideas/listings";
            Net.get<IdeasListings>(url).then((listings) => {
                AppStateChange.setIdeaListings(listings);
            });
        }
    }, []);

    const ideas = appState.listing.value.ideas;

    if (ideas) {
        return (
            <article>
                <h1 class="ui">{capitalise(resource)}</h1>
                <SlimDeckGrouping label="Recent" list={ideas.recent} expanded />
                <SlimDeckGrouping
                    label="Orphans"
                    list={ideas.orphans}
                    hideEmpty
                />
                <SlimDeckGrouping
                    label="Unnoted"
                    list={ideas.unnoted}
                    hideEmpty
                />
            </article>
        );
    } else {
        return <div></div>;
    }
}

function Idea({ path, id }: { path?: string; id?: string }) {
    const [searchResults, setSearchResults]: [Array<SlimDeck>, Function] =
        useState([]); // an array of backrefs
    const ideaId = id ? parseInt(id, 10) : 0;

    useEffect(() => {
        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.get<SearchResults>(`/api/ideas/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    const deckKind: DeckKind = DeckKind.Idea;

    const deckManager = DeckManager({
        id: ideaId,
        deckKind,
        hasSummaryPassage: false,
        hasReviewPassage: false,
    });

    const deck: DeckIdea | undefined = deckManager.getDeck() as
        | DeckIdea
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
                >
                    <LeftMarginHeading>
                        {formattedDate(deck.createdAt)}
                    </LeftMarginHeading>
                </TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <div>
                        <DeleteDeckConfirmation
                            deckKind={DeckKind.Idea}
                            id={ideaId}
                        />
                        <IdeaUpdater
                            idea={deck}
                            onUpdate={deckManager.updateAndReset}
                            onCancel={deckManager.onFormHide}
                        />{" "}
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
                    deckKind={deckKind}
                    title={deck.title}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onRefsChanged={deckManager.onRefsChanged}
                    onUpdateDeck={deckManager.update}
                />
                <SegmentBackRefs deck={deck} />
                <SegmentSearchResults searchResults={searchResults} />
                <SegmentGraph depth={2} deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

type IdeaUpdaterProps = {
    idea: DeckIdea;
    onUpdate: (d: DeckIdea) => void;
    onCancel: () => void;
};

function IdeaUpdater({ idea, onUpdate, onCancel }: IdeaUpdaterProps) {
    const [title, setTitle] = useState(idea.title || "");
    const [graphTerminator, setGraphTerminator] = useState(
        idea.graphTerminator
    );
    const [insigniaId, setInsigniaId] = useState(idea.insignia || 0);

    useEffect(() => {
        if (idea.title && idea.title !== "" && title === "") {
            setTitle(idea.title);
        }
        if (idea.graphTerminator !== undefined) {
            setGraphTerminator(idea.graphTerminator);
        }

        if (idea.insignia !== undefined) {
            setInsigniaId(idea.insignia);
        }
    }, [idea]);

    function handleContentChange(content: string) {
        setTitle(content);
    }

    function handleSubmit(event: Event) {
        type SubmitData = {
            title: string;
            graphTerminator: boolean;
            insignia: number;
        };

        const data: SubmitData = {
            title: title.trim(),
            graphTerminator: graphTerminator,
            insignia: insigniaId,
        };

        Net.put<SubmitData, DeckIdea>(`/api/ideas/${idea.id}`, data).then(
            (newDeck) => {
                onUpdate(newDeck);
            }
        );

        event.preventDefault();
    }

    function handleCheckbox(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            if (event.target.id === "graph-terminator") {
                setGraphTerminator(!graphTerminator);
            }
        }
    }

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="title">Title:</label>
            <br />

            <CivilInput
                id="title"
                value={title}
                onContentChange={handleContentChange}
            />
            <br />

            <InsigniaSelector
                insigniaId={insigniaId}
                onChange={setInsigniaId}
            />
            <br />

            <label for="graph-terminator">Graph Terminator:</label>
            <input
                type="checkbox"
                id="graph-terminator"
                name="graph-terminator"
                onInput={handleCheckbox}
                checked={graphTerminator}
            />
            <br />
            <input
                type="button"
                value="Cancel"
                class="dialog-cancel"
                onClick={onCancel}
            />
            <input type="submit" value="Update Idea" />
        </form>
    );
}

export { Ideas, Idea };
