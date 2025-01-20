import { useEffect, useState } from "preact/hooks";

import { DeckKind } from "../enums";
import type { DM, DeckConcept, SlimDeck } from "../types";

import { formattedDate } from "../shared/time";
import { getUrlParamNumber, getUrlParamString, setUrlParam } from "../shared/url-params";

import CivilButtonCreateDeck from "./civil-button-create-deck";
import { CivContainer, CivMain } from "./civil-layout";
import CivilTabButton from "./civil-tab-button";
import ConvertDeckConfirmation from "./convert-deck-confirmation";
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

function Concepts({ path }: { path?: string }) {
    return (
        <div>
            <ConceptsModule />
            <RecentlyVisited deckKind={DeckKind.Concept} numRecent={30} />
            <SegmentInsignias deckKind={DeckKind.Concept} />
        </div>
    );
}

function ConceptsModule() {
    const [selected, setSelected] = useState(getUrlParamString("concept-type", "recent"));
    const [offset, setOffset] = useState(getUrlParamNumber("concept-offset", 0));

    useEffect(() => {
        setUrlParam("concept-type", selected);
    }, [selected]);

    useEffect(() => {
        setUrlParam("concept-offset", `${offset}`);
    }, [offset]);

    function setSelectedAndResetOffset(s: string) {
        setSelected(s);
        setOffset(0);
    }

    return (
        <HeadedSegment
            extraClasses="c-concepts-module"
            heading="Concepts"
            extraHeadingClasses="margin-top-0"
        >
            <ConceptsSelector setSelected={setSelectedAndResetOffset} selected={selected} />
            <ConceptsPaginator selected={selected} offset={offset} setOffset={setOffset} />
        </HeadedSegment>
    );
}

function ConceptsSelector({
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
            return "pigment-concepts selected";
        } else {
            return "";
        }
    }

    const headings: Array<string> = ["recent", "orphans", "unnoted"];

    return (
        <div class="c-concepts-selector pagination-top-selector">
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

function ConceptsPaginator({ selected, offset, setOffset }: { selected: string, offset: number, setOffset: (o: number) => void }) {
    const url = `/api/concepts/${selected}`;

    const lowerContent = (
        <CivilButtonCreateDeck deckKind={DeckKind.Concept}></CivilButtonCreateDeck>
    );

    return (
        <Pagination
            url={url}
            renderItem={listItemSlimDeck}
            offset={offset}
            changedOffset={setOffset}
            itemsPerPage={10}
            lowerContent={lowerContent}
        />
    );
}

function Concept({ path, id }: { path?: string; id?: string }) {
    const deckManager: DM<DeckConcept> = useDeckManager(id, DeckKind.Concept);

    const deck: DeckConcept | undefined = deckManager.getDeck();

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
                                <ConvertDeckConfirmation
                                    convertText="Convert to Idea..."
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

export { Concept, Concepts };
