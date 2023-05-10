import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DM,
    DeckIdea,
    DeckKind,
    SlimDeck,
    IdeasListings,
    SearchResults,
} from "types";

import Net from "utils/net";
import { formattedDate } from "utils/js";
import { getAppState, AppStateChange } from "app-state";

import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import DeckListingPage from "components/deck-listing-page";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import InsigniaSelector from "components/insignias/selector";
import LeftMarginHeading from "components/left-margin-heading";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";
import SegmentSearchResults from "components/segment-search-results";
import TopMatter from "components/top-matter";
import { SlimDeckGrouping } from "components/groupings";

function Ideas({ path }: { path?: string }) {
    const appState = getAppState();

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
            <DeckListingPage deckKind={DeckKind.Idea}>
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
            </DeckListingPage>
        );
    } else {
        return <div></div>;
    }
}

function Idea({ path, id }: { path?: string; id?: string }) {
    const [searchResults, setSearchResults]: [Array<SlimDeck>, Function] =
        useState([]); // an array of backrefs

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

    const deckManager: DM<DeckIdea> = useDeckManager(id, DeckKind.Idea);

    const deck: DeckIdea | undefined = deckManager.getDeck();
    if (deck) {
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
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
                            deckKind={deckManager.getDeckKind()}
                            id={deck.id}
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
                    deckKind={deckManager.getDeckKind()}
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
