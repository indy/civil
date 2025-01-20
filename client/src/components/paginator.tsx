import { type ComponentChildren } from "preact";
import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import { DeckKind } from "../enums";
import type { SlimDeck } from "../types";

import { getAppState } from "../app-state";

import {
    deckKindToHeadingString,
    deckKindToResourceString,
} from "../shared/deck";
import { capitalise } from "../shared/english";
import { getUrlParamDeckKind, setUrlParamDeckKind, getUrlParamNumber, setUrlParam } from "../shared/url-params";

import CivilButtonCreateDeck from "./civil-button-create-deck";
import CivilTabButton from "./civil-tab-button";
import { HeadedSegment } from "./headed-segment";
import { listItemArticle, listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";

export default function Paginator({ }) {
    const [selected, setSelected] = useState(getUrlParamDeckKind());
    const [offset, setOffset] = useState(getUrlParamNumber("deck-offset", 0));

    useEffect(() => {
        setUrlParamDeckKind(selected);
    }, [selected]);

    useEffect(() => {
        setUrlParam("deck-offset", `${offset}`);
    }, [offset]);

    function setSelectedAndResetOffset(dk: DeckKind) {
        setSelected(dk);
        setOffset(0);
    }

    return (
        <HeadedSegment
            extraClasses="c-paginator"
            heading="Decks"
            extraHeadingClasses="margin-top-0"
        >
            <PaginatorTopSelector
                setSelected={setSelectedAndResetOffset}
                selected={selected}
            />
            <DeckPaginator deckKind={selected} offset={offset} setOffset={setOffset} />
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
        DeckKind.Concept,
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
    offset: number;
    setOffset: (o: number) => void
};

function DeckPaginator({ deckKind, offset, setOffset }: DeckPaginatorProps) {
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
        listItemSlimDeck;
    switch (deckKind) {
        case DeckKind.Article:
            renderItem = listItemArticle;
            break;
        case DeckKind.Person:
            renderItem = listItemSlimDeck;
            break;
        case DeckKind.Event:
            renderItem = listItemSlimDeck;
            break;
        case DeckKind.Idea:
            renderItem = listItemSlimDeck;
            break;
        case DeckKind.Concept:
            renderItem = listItemSlimDeck;
            break;
        case DeckKind.Dialogue:
            renderItem = listItemSlimDeck;
            break;
        case DeckKind.Quote:
            renderItem = listItemSlimDeck;
            break;
        case DeckKind.Timeline:
            renderItem = listItemSlimDeck;
            break;
    }

    return (
        <Pagination
            url={url}
            renderItem={renderItem}
            offset={offset}
            changedOffset={setOffset}
            itemsPerPage={itemsPerPage}
            upperContent={upperContent}
            lowerContent={lowerContent}
        />
    );
}
