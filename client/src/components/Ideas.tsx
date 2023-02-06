import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { IIdeasListings, ISearchResults, IDeckSimple } from "../types";

import Net from "../Net";
import { capitalise, formattedDate } from "../JsUtils";
import { deckTitle } from "../CivilUtils";
import { getAppState, AppStateChange } from "../AppState";

import { DeckSimpleListSection } from "./ListSections";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import DeckManager from "./DeckManager";
import { DeluxeToolbar } from "./DeluxeToolbar";
import TopMatter from "./TopMatter";
import LeftMarginHeading from "./LeftMarginHeading";
import { InsigniaSelector } from "./Insignias";
import CivilInput from "./CivilInput";
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionSearchResultsBackref from "./SectionSearchResultsBackref";
import SectionNotes from "./SectionNotes";
import SectionGraph from "./SectionGraph";

function Ideas({ path }: { path?: string }) {
    const appState = getAppState();
    const resource = "ideas";

    useEffect(() => {
        if (!appState.listing.value.ideas) {
            let url: string = "/api/ideas/listings";
            Net.get<IIdeasListings>(url).then((listing) => {
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
    const [searchResults, setSearchResults]: [Array<IDeckSimple>, any] =
        useState([]); // an array of backrefs
    const ideaId = id ? parseInt(id, 10) : 0;

    useEffect(() => {
        // This  additional search query is slow, so it has to be a separate
        // async call rather than part of the idea's GET response.
        //
        // todo: change this to accept a search parameter, this will normally default to the idea.title
        // but would also allow differently worded but equivalent text
        //
        Net.get<ISearchResults>(`/api/ideas/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    const resource = "ideas";

    const deckManager = DeckManager({
        id: ideaId,
        resource,
        hasSummarySection: false,
        hasReviewSection: false,
    });

    let deck = deckManager.getDeck() as any;

    return (
        <article>
            <DeluxeToolbar />

            {deck && (
                <TopMatter
                    title={deckTitle(deck)}
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
            )}

            {deckManager.isShowingUpdateForm() && (
                <div>
                    <DeleteDeckConfirmation resource="ideas" id={ideaId} />
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
                resource="ideas"
                title={deckTitle(deck)}
                howToShowNoteSection={deckManager.howToShowNoteSection}
                canShowNoteSection={deckManager.canShowNoteSection}
                onRefsChanged={deckManager.onRefsChanged}
                onUpdateDeck={deckManager.update}
            />
            <SectionBackRefs deck={deck} />
            <SectionSearchResultsBackref backrefs={searchResults} />
            <SectionGraph depth={2} deck={deck} />
        </article>
    );
}

function SectionUpdateIdea({ idea, onUpdate }: { idea?: any; onUpdate?: any }) {
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

    const handleChangeEvent = (event) => {
        const target = event.target;
        const name = target.name;
        const value = target.value;

        if (name === "title") {
            setTitle(value);
        }
    };

    interface IDeck {
        fuckKnowsWhatGoesHere: string;
    }

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

        Net.put<ISubmitData, IDeck>(`/api/ideas/${idea.id}`, data).then(
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
