import { h } from "preact";
import { route } from "preact-router";
import { useState } from "preact/hooks";

import { DeckKind, SlimDeck } from "types";

import { getAppState } from "app-state";

import { capitalise } from "shared/english";
import { deckKindToResourceString, deckKindToHeadingString } from "shared/deck";

import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilTabButton from "components/civil-tab-button";
import ListingLink from "components/listing-link";
import Pagination from "components/pagination";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

export default function Paginator({}) {
    const [selected, setSelected] = useState(DeckKind.Idea);
    // margin-top-9 provides the empty space for the command bar to appear
    return (
        <article class="c-paginator module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui margin-top-0">Decks</h3>
                </CivLeft>
                <CivMain>
                    <PaginatorTopSelector
                        setSelected={setSelected}
                        selected={selected}
                    />
                    <DeckPaginator deckKind={selected} />
                </CivMain>
            </CivContainer>
        </article>
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
        <div class="c-paginator-top-selector">
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

    function renderItem(deck: SlimDeck, i: number) {
        return (
            <ListingLink
                slimDeck={deck}
                extraClasses={i % 2 ? "stripe-a" : "stripe-b"}
            />
        );
    }

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
            renderItem={renderItem}
            itemsPerPage={itemsPerPage}
            upperContent={upperContent}
            lowerContent={lowerContent}
        />
    );
}
