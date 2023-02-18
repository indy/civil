import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DeckIdea,
    DeckKind,
    DeckSimple,
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
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionGraph from "./SectionGraph";
import SectionNotes from "./SectionNotes";
import SectionSearchResults from "./SectionSearchResults";
import TopMatter from "./TopMatter";
import { DeckSimpleListSection } from "./ListSections";
import { DeluxeToolbar } from "./DeluxeToolbar";
import { InsigniaSelector } from "./Insignias";

function Ideas({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "ideas";

    useEffect(() => {
        if (!appState.listing.value.ideas) {
            let url: string = "/api/ideas/listings";
            Net.get<IdeasListings>(url).then((listing) => {
                AppStateChange.setIdeasListing(listing);
            });
        }
    }, []);

    const ideas = appState.listing.value.ideas;

    if (ideas) {
        return (
            <article>
                <h1 class="ui">{capitalise(resource)}</h1>
                <DeckSimpleListSection
                    label="Recent"
                    list={ideas.recent}
                    expanded
                />
                <DeckSimpleListSection
                    label="Orphans"
                    list={ideas.orphans}
                    hideEmpty
                />
                <DeckSimpleListSection
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
    const [searchResults, setSearchResults]: [Array<DeckSimple>, any] =
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
        hasSummarySection: false,
        hasReviewSection: false,
    });

    const deck: DeckIdea | undefined = deckManager.getDeck() as
        | DeckIdea
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
                        <SectionUpdateIdea
                            idea={deck}
                            onUpdate={deckManager.updateAndReset}
                        />{" "}
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
                    deckKind={deckKind}
                    title={deck.title}
                    howToShowNoteSection={deckManager.howToShowNoteSection}
                    canShowNoteSection={deckManager.canShowNoteSection}
                    onRefsChanged={deckManager.onRefsChanged}
                    onUpdateDeck={deckManager.update}
                />
                <SectionBackRefs deck={deck} />
                <SectionSearchResults searchResults={searchResults} />
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

type SectionUpdateIdeaProps = {
    idea: DeckIdea;
    onUpdate: (d: DeckIdea) => void;
};

function SectionUpdateIdea({ idea, onUpdate }: SectionUpdateIdeaProps) {
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

    const handleChangeEvent = (event: Event) => {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value = target.value;

            if (name === "title") {
                setTitle(value);
            }
        }
    };

    interface ISubmitData {
        title: string;
        graphTerminator: boolean;
        insignia: number;
    }

    const handleSubmit = (event: Event) => {
        const data: ISubmitData = {
            title: title.trim(),
            graphTerminator: graphTerminator,
            insignia: insigniaId,
        };

        Net.put<ISubmitData, DeckIdea>(`/api/ideas/${idea.id}`, data).then(
            (newDeck) => {
                onUpdate(newDeck);
            }
        );

        event.preventDefault();
    };

    const handleCheckbox = (event: Event) => {
        if (event.target instanceof HTMLInputElement) {
            if (event.target.id === "graph-terminator") {
                setGraphTerminator(!graphTerminator);
            }
        }
    };

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="title">Title:</label>
            <br />

            <CivilInput id="title" value={title} onInput={handleChangeEvent} />
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

            <input type="submit" value="Update Idea" />
        </form>
    );
}

export { Ideas, Idea };
