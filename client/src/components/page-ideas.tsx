import { useState } from "preact/hooks";

import { DeckKind } from "../enums";
import type { DM, DeckIdea, SlimDeck } from "../types";

import { formattedDate } from "../shared/time";

import CivilButtonCreateDeck from "./civil-button-create-deck";
import { CivContainer, CivMain } from "./civil-layout";
import CivilTabButton from "./civil-tab-button";
import DeckUpdater from "./deck-updater";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import { HeadedSegment } from "./headed-segment";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";
import RecentlyVisited from "./recently-visited";
import SegmentArrivals from "./segment-arrivals";
import SegmentDeckRefs from "./segment-deck-refs";
import SegmentGraph from "./segment-graph";
import SegmentHits from "./segment-hits";
import SegmentInsignias from "./segment-insignias";
import SegmentNotes from "./segment-notes";
import SegmentSearchResults from "./segment-search-results";
import TopMatter from "./top-matter";
import useDeckManager from "./use-deck-manager";

function Ideas({ path }: { path?: string }) {
    return (
        <div>
            <IdeasModule />
            <RecentlyVisited deckKind={DeckKind.Idea} numRecent={30} />
            <SegmentInsignias deckKind={DeckKind.Idea} />
        </div>
    );
}

function IdeasModule() {
    const [selected, setSelected] = useState("recent");

    return (
        <HeadedSegment
            extraClasses="c-ideas-module"
            heading="Ideas"
            extraHeadingClasses="margin-top-0"
        >
            <IdeasSelector setSelected={setSelected} selected={selected} />
            <IdeasPaginator selected={selected} />
        </HeadedSegment>
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
            renderItem={listItemSlimDeck}
            itemsPerPage={10}
            lowerContent={lowerContent}
        />
    );
}

function Idea({ path, id }: { path?: string; id?: string }) {
    const deckManager: DM<DeckIdea> = useDeckManager(id, DeckKind.Idea);

    const deck: DeckIdea | undefined = deckManager.getDeck();

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
                    deckKind={deckManager.getDeckKind()}
                    title={deck.title}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onRefsChanged={deckManager.onRefsChanged}
                    onUpdateDeck={deckManager.update}
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

export { Idea, Ideas };
