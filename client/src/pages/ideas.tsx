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
import { deckKindToHeadingString } from "utils/civil";
import { formattedDate } from "utils/js";
import { getAppState, AppStateChange } from "app-state";

import CivilButton from "components/civil-button";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import Module from "components/module";
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
import {
    CivContainer,
    CivMain,
    CivForm,
    CivLeftLabel,
} from "components/civil-layout";


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
    return ideas ? <IdeasModule ideas={ideas} /> : <div />;
}

function IdeasModule({ ideas }: { ideas: IdeasListings }) {
    let buttons = (
        <span>
            <CivilButton>Add a new Idea...</CivilButton>
        </span>
    );
    return (
        <Module
            heading={deckKindToHeadingString(DeckKind.Idea)}
            buttons={buttons}
        >
            <SlimDeckGrouping label="Recent" list={ideas.recent} expanded />
            <SlimDeckGrouping label="Orphans" list={ideas.orphans} hideEmpty />
            <SlimDeckGrouping label="Unnoted" list={ideas.unnoted} hideEmpty />
        </Module>
    );
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
                    <section>
                        <CivContainer>
                            <CivMain>
                                <DeleteDeckConfirmation
                                    deckKind={deckManager.getDeckKind()}
                                    id={deck.id}
                                />
                            </CivMain>
                        </CivContainer>
                        <div class="vertical-spacer"></div>
                        <CivContainer>
                            <IdeaUpdater
                                idea={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={deckManager.onFormHide}
                            />
                        </CivContainer>
                    </section>
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
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="title">Title</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="title"
                    value={title}
                    onContentChange={handleContentChange}
                />
            </CivMain>

            <CivLeftLabel extraClasses="insignia-form-label">
                Insignias
            </CivLeftLabel>
            <CivMain>
                <InsigniaSelector
                    insigniaId={insigniaId}
                    onChange={setInsigniaId}
                />
            </CivMain>

            <CivLeftLabel
                extraClasses="graph-terminator-form-label"
                forId="graph-terminator"
            >
                Graph Terminator
            </CivLeftLabel>
            <CivMain>
                <input
                    type="checkbox"
                    id="graph-terminator"
                    name="graph-terminator"
                    onInput={handleCheckbox}
                    checked={graphTerminator}
                />
            </CivMain>

            <CivMain>
                <input
                    type="button"
                    value="Cancel"
                    class="dialog-cancel"
                    onClick={onCancel}
                />
                <input type="submit" value="Update Idea" />
            </CivMain>
        </CivForm>
    );
}

export { Ideas, Idea, IdeasModule };
