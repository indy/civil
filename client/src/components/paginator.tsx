import { h } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";

import { DeckKind } from "types";

import { getAppState } from "app-state";

import { deckKindToHeadingString, deckKindToResourceString } from "shared/deck";
import { capitalise } from "shared/english";

import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilTabButton from "components/civil-tab-button";
import { HeadedSegment } from "components/headed-segment";
import { renderPaginatedSlimDeck } from "components/paginated-render-items";
import Pagination from "components/pagination";

export default function Paginator({}) {
    const [selected, setSelected] = useState(DeckKind.Idea);
    // margin-top-9 provides the empty space for the command bar to appear

    return (
        <HeadedSegment
            extraClasses="c-paginator"
            heading="Decks"
            extraHeadingClasses="margin-top-0"
        >
            <PaginatorTopSelector
                setSelected={setSelected}
                selected={selected}
            />
            <DeckPaginator deckKind={selected} />
        </HeadedSegment>
    );
}

function PaginatorTopSelector({
    selected,
    setSelected,
}: {
    selected: DeckKind;
    setSelected: (deckKind: DeckKind) => void;
}) {
    function deckKindText(deckKind: DeckKind): string {
        return capitalise(deckKindToResourceString(deckKind));
    }

    function deckKindClass(deckKind: DeckKind): string {
        if (deckKind === selected) {
            return `pigment-${deckKindToResourceString(deckKind)} selected`;
        }
        return "";
    }

    function onClicked(deckKind: DeckKind) {
        setSelected(deckKind);
    }

    const deckKinds: Array<DeckKind> = [
        DeckKind.Idea,
        DeckKind.Article,
        DeckKind.Person,
        DeckKind.Event,
        DeckKind.Timeline,
        DeckKind.Quote,
        DeckKind.Dialogue,
    ];

    return (
        <div class="c-paginator-top-selector pagination-top-selector">
            {deckKinds.map((deckKind) => (
                <div class="paginator-item">
                    <CivilTabButton
                        extraClasses={deckKindClass(deckKind)}
                        onClick={() => {
                            onClicked(deckKind);
                        }}
                    >
                        {deckKindText(deckKind)}
                    </CivilTabButton>
                </div>
            ))}
        </div>
    );
}

type DeckPaginatorProps = {
    deckKind: DeckKind;
};

function DeckPaginator({ deckKind }: DeckPaginatorProps) {
    const appState = getAppState();

    const deckName = deckKindToResourceString(deckKind);
    const itemsPerPage = appState.uiConfig.value.decksPerPage[deckKind];
    const url = `/api/${deckName}/pagination`;

    function onClickedHeading() {
        route(`/${deckKindToResourceString(deckKind)}`);
    }
    let klass = "paginator-deck-heading ui clickable ";
    klass += `pigment-fg-${deckKindToResourceString(deckKind)}`;

    const upperContent = (
        <div class={klass} onClick={onClickedHeading}>
            {deckKindToHeadingString(deckKind)}
        </div>
    );

    const lowerContent = (
        <CivilButtonCreateDeck deckKind={deckKind}></CivilButtonCreateDeck>
    );

    return (
        <Pagination
            url={url}
            renderItem={renderPaginatedSlimDeck}
            itemsPerPage={itemsPerPage}
            upperContent={upperContent}
            lowerContent={lowerContent}
        />
    );
}
