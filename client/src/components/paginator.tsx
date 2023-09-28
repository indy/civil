import { ComponentChildren } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";

import { SlimDeck, DeckKind } from "../types";

import { getAppState } from "../app-state";

import {
    deckKindToHeadingString,
    deckKindToResourceString,
} from "../shared/deck";
import { capitalise } from "../shared/english";

import CivilButtonCreateDeck from "./civil-button-create-deck";
import CivilTabButton from "./civil-tab-button";
import { HeadedSegment } from "./headed-segment";
import {
    renderPaginatedArticle,
    renderPaginatedPerson,
    renderPaginatedEvent,
    renderPaginatedSlimDeck,
} from "./paginated-render-items";
import Pagination from "./pagination";

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

    let renderItem: (s: SlimDeck, i: number) => ComponentChildren =
        renderPaginatedSlimDeck;
    switch (deckKind) {
        case DeckKind.Article:
            renderItem = renderPaginatedArticle;
            break;
        case DeckKind.Person:
            renderItem = renderPaginatedPerson;
            break;
        case DeckKind.Event:
            renderItem = renderPaginatedEvent;
            break;
        default:
            renderItem = renderPaginatedSlimDeck;
    }

    return (
        <Pagination
            url={url}
            renderItem={renderItem}
            itemsPerPage={itemsPerPage}
            upperContent={upperContent}
            lowerContent={lowerContent}
        />
    );
}
