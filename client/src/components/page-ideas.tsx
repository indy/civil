import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    DM,
    DeckIdea,
    DeckKind,
    DeckUpdate,
    SlimDeck,
    IdeasListings,
    ResultList,
} from "types";

import Net from "shared/net";
import { formattedDate } from "shared/time";
import { getAppState, AppStateChange } from "app-state";

import TopBarMenu from "components/top-bar-menu";
import CivilButton from "components/civil-button";
import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import InsigniaSelector from "components/insignia-selector";
import FontSelector from "components/font-selector";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import SegmentGraph from "components/segment-graph";
import SegmentNotes from "components/segment-notes";
import SegmentSearchResults from "components/segment-search-results";
import TopMatter from "components/top-matter";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";
import {
    CivContainer,
    CivMain,
    CivForm,
    CivLeft,
    CivLeftLabel,
} from "components/civil-layout";
import CivilTabButton from "components/civil-tab-button";
import Pagination from "components/pagination";

function Ideas({ path }: { path?: string }) {
    const appState = getAppState();

    useEffect(() => {
        if (!appState.listing.value.ideas) {
            let url: string = "/api/ideas/listings";
            Net.get<IdeasListings>(url).then((listings) => {
                AppStateChange.setIdeaListings({ ideaListings: listings });
            });
        }
    }, []);

    const ideas = appState.listing.value.ideas;
    return ideas ? <div><TopBarMenu /><IdeasModule ideas={ideas} /></div> : <div />;
}

function IdeasModule({ ideas }: { ideas: IdeasListings }) {
    const [selected, setSelected] = useState("recent");

    return (
        <article class="c-ideas-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui margin-top-0">Ideas</h3>
                </CivLeft>
                <CivMain>
                    <IdeasSelector
                        setSelected={setSelected}
                        selected={selected}
                    />
                    <IdeasPaginator selected={selected} />
                </CivMain>
            </CivContainer>
        </article>
    );
}

function IdeasSelector({
    selected,
    setSelected,
}: {
    selected: string;
    setSelected: (s: string) => void;
}) {
    function onClicked(s: string) {
        setSelected(s);
    }

    function selectedCheck(h: string) {
        if (h === selected) {
            return "pigment-ideas selected";
        } else {
            return "";
        }
    }

    const headings: Array<string> = ["recent", "orphans", "unnoted"];

    return (
        <div class="c-ideas-selector pagination-top-selector">
            {headings.map((heading) => (
                <div class="paginator-item">
                    <CivilTabButton
                        extraClasses={selectedCheck(heading)}
                        onClick={() => {
                            onClicked(heading);
                        }}
                    >
                        {heading}
                    </CivilTabButton>
                </div>
            ))}
        </div>
    );
}

function IdeasPaginator({ selected }: { selected: string }) {
    const url = `/api/ideas/${selected}`;

    const lowerContent = (
        <CivilButtonCreateDeck deckKind={DeckKind.Idea}></CivilButtonCreateDeck>
    );

    return (
        <Pagination
            url={url}
            renderItem={renderPaginatedSlimDeck}
            itemsPerPage={10}
            lowerContent={lowerContent}
        />
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
        Net.get<ResultList>(`/api/ideas/${id}/additional_search`).then(
            (searchResults) => {
                setSearchResults(searchResults.results);
            }
        );
    }, [id]);

    const deckManager: DM<DeckIdea> = useDeckManager(id, DeckKind.Idea);

    const deck: DeckIdea | undefined = deckManager.getDeck();
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
                >
                    {formattedDate(deck.createdAt)}
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
                    deckKind={deckManager.getDeckKind()}
                    title={deck.title}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onRefsChanged={deckManager.onRefsChanged}
                    onUpdateDeck={deckManager.update}
                />
                <SegmentBackRefs deck={deck} />
                <SegmentSearchResults
                    font={deck.font}
                    searchResults={searchResults}
                />
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
    const [font, setFont] = useState(idea.font);

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

        if (idea.font) {
            setFont(idea.font);
        }
    }, [idea]);

    function handleContentChange(content: string) {
        setTitle(content);
    }

    function handleSubmit(event: Event) {
        const data: DeckUpdate = {
            title: title.trim(),
            insignia: insigniaId,
            font,
            graphTerminator: !!graphTerminator,
        };

        Net.put<DeckUpdate, DeckIdea>(`/api/ideas/${idea.id}`, data).then(
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

            <CivLeftLabel extraClasses="icon-left-label">
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

            <CivLeftLabel>Font</CivLeftLabel>
            <CivMain>
                <FontSelector font={font} onChangedFont={setFont} />
            </CivMain>

            <CivMain>
                <CivilButton extraClasses="dialog-cancel" onClick={onCancel}>
                    Cancel
                </CivilButton>
                <input
                    class="c-civil-button"
                    type="submit"
                    value="Update Idea"
                />
            </CivMain>
        </CivForm>
    );
}

export { Ideas, Idea, IdeasModule };
