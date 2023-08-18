import { h, ComponentChildren } from "preact";
import { route } from "preact-router";
import { useState, useEffect } from "preact/hooks";

import { DeckKind, SlimDeck } from "types";

import { getAppState } from "app-state";

import { capitalise } from "shared/english";
import Net from "shared/net";

import ListingLink from "components/listing-link";

import { deckKindToResourceString, deckKindToHeadingString } from "shared/deck";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import CivilButton from "components/civil-button";
import CivilTabButton from "components/civil-tab-button";
import CivilButtonCreateDeck from "components/civil-button-create-deck";

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

type LocalState = {
    offset: number;
    decksPerPage: number;
    decks: Array<SlimDeck>;
    lastUrl: string;
};

function DeckPaginator({ deckKind }: DeckPaginatorProps) {
    const appState = getAppState();

    const initialState: LocalState = {
        offset: 0,
        decksPerPage: appState.uiConfig.value.decksPerPage[deckKind],
        decks: [],
        lastUrl: "",
    };
    const [localState, setLocalState] = useState(initialState);

    function fetchData() {
        const deckName = deckKindToResourceString(deckKind);
        const offset = localState.offset;
        const numResults = localState.decksPerPage;

        const url = `/api/${deckName}/pagination?offset=${offset}&numResults=${numResults}`;
        // don't fetch the same data that we already have
        //
        if (url !== localState.lastUrl) {
            console.log("fetching: " + url);
            Net.get<Array<SlimDeck>>(url).then((decks) => {
                setLocalState({
                    ...localState,
                    decks,
                    lastUrl: url,
                });
            });
        }
    }

    useEffect(() => {
        fetchData();
    }, [localState.offset]);

    useEffect(() => {
        if (localState.offset !== 0) {
            // changing offset will invoke the useEffect which will fetchData
            setLocalState({
                ...localState,
                offset: 0,
            });
        } else {
            fetchData();
        }
    }, [deckKind]);

    function changedOffset(offset: number) {
        setLocalState({
            ...localState,
            offset,
        });
    }

    function onPrevClicked() {
        changedOffset(Math.max(localState.offset - localState.decksPerPage, 0));
    }

    function onNextClicked() {
        changedOffset(localState.offset + localState.decksPerPage);
    }

    function isPrevDisabled(): boolean {
        return localState.offset === 0;
    }

    function isNextDisabled(): boolean {
        return (
            localState.offset + localState.decksPerPage >=
            appState.numDecksPerDeckKind.value[deckKind]
        );
    }

    function onClickedHeading() {
        route(`/${deckKindToResourceString(deckKind)}`);
    }

    let maxPages =
        appState.numDecksPerDeckKind.value[deckKind] /
        initialState.decksPerPage;
    if (
        appState.numDecksPerDeckKind.value[deckKind] %
            initialState.decksPerPage >
        0
    ) {
        maxPages += 1;
    }
    maxPages = Math.floor(maxPages);

    const pageNumber = 1 + localState.offset / localState.decksPerPage;

    let klass = "paginator-deck-heading ui clickable ";
    klass += `pigment-fg-${deckKindToResourceString(deckKind)}`;

    let pageCountClass = `ui-bold paginator-page-count pigment-fg-${deckKindToResourceString(
        deckKind
    )}`;

    return (
        <div class="c-deck-paginator">
            <div class="top-border-line">
                <div class="button-row">
                    <CivilButton
                        onClick={onPrevClicked}
                        disabled={isPrevDisabled()}
                    >
                        PrevPage
                    </CivilButton>
                    <CivilButton
                        onClick={onNextClicked}
                        disabled={isNextDisabled()}
                    >
                        NextPage
                    </CivilButton>
                </div>
                <div class={klass} onClick={onClickedHeading}>
                    {deckKindToHeadingString(deckKind)}
                </div>
            </div>
            <ul class="bottom-border-line standard-list">
                {buildListing(localState.decks)}
            </ul>
            <span class={pageCountClass}>
                Page {pageNumber}/{maxPages}
            </span>
            <CivilButtonCreateDeck deckKind={deckKind}></CivilButtonCreateDeck>
        </div>
    );
}

function buildListing(list: Array<SlimDeck>): Array<ComponentChildren> {
    return list.map((deck, i) => (
        <ListingLink
            slimDeck={deck}
            extraClasses={i % 2 ? "stripe-a" : "stripe-b"}
        />
    ));
}
