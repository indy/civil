import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { DeckKind, DeckArticle, SlimDeck, ResultList } from "types";
import { buildSlimDeck } from "shared/deck";

import Net from "shared/net";

import DeckLink from "components/deck-link";
import ListingLink from "components/listing-link";
import { StarRatingWithinListing } from "components/star-rating";
import Toggler from "components/toggler";

function SlimDeckList({ list }: { list: Array<SlimDeck> }) {
    return (
        <div>
            <ul class="standard-list">{buildListing(list)}</ul>
        </div>
    );
}

type SlimDeckGroupingProps = {
    label: string;
    list: Array<SlimDeck>;
    expanded?: boolean;
    hideEmpty?: boolean;
};
function SlimDeckGrouping({
    label,
    list,
    expanded,
    hideEmpty,
}: SlimDeckGroupingProps) {
    let [show, setShow] = useState(expanded || false);

    function toggleShow() {
        setShow(!show);
    }

    if (hideEmpty && list && list.length === 0) {
        return <div></div>;
    } else {
        return (
            <Toggler toggleShow={toggleShow} label={label} show={show}>
                {show && <ul class="compacted-list">{buildListing(list)}</ul>}
            </Toggler>
        );
    }
}

type LazyLoadedGroupingProps = {
    label: string;
    url: string;
};

function LazyLoadedGrouping({ label, url }: LazyLoadedGroupingProps) {
    type State = {
        fetchedData: boolean;
        list: Array<SlimDeck>;
        show: boolean;
    };

    let initialState: State = {
        fetchedData: false,
        list: [],
        show: false,
    };
    let [localState, setLocalState] = useState(initialState);

    function toggleShow() {
        const visible = !localState.show;
        setLocalState({
            ...localState,
            show: visible,
        });
        if (visible && !localState.fetchedData) {
            Net.get<ResultList>(url).then((resultList) => {
                if (resultList.results) {
                    setLocalState({
                        ...localState,
                        fetchedData: true,
                        list: resultList.results,
                        show: true,
                    });
                }
            });
        }
    }

    return (
        <Toggler toggleShow={toggleShow} label={label} show={localState.show}>
            <ul class="compacted-list">{buildListing(localState.list)}</ul>
        </Toggler>
    );
}

type RatedGroupingProps = {
    label: string;
    list: Array<DeckArticle>;
    expanded?: boolean;
};

function RatedGrouping({ label, list, expanded }: RatedGroupingProps) {
    let [show, setShow] = useState(expanded || false);

    function toggleShow() {
        setShow(!show);
    }

    return (
        <Toggler toggleShow={toggleShow} label={label} show={show}>
            <ul class="standard-list">{show && buildRatingListing(list)}</ul>
        </Toggler>
    );
}

function buildListing(list: Array<SlimDeck>): Array<ComponentChildren> {
    return list.map((deck) => <ListingLink slimDeck={deck} />);
}

function buildRatingListing(list: Array<DeckArticle>) {
    if (!list) {
        return [];
    }
    return list.map((deck) => <RatedListingLink deck={deck} />);
}

type RatedListingLinkProps = {
    deck: DeckArticle;
};

// based off ListingLink but displays a star rating in the left hand margin
//
function RatedListingLink({ deck }: RatedListingLinkProps) {
    let { id, title, rating, shortDescription, insignia, font } = deck;
    let slimDeck = buildSlimDeck(DeckKind.Article, id, title, insignia, font);

    return (
        <li>
                    <StarRatingWithinListing rating={rating} />
                    <DeckLink slimDeck={slimDeck} />
                    <span class="descriptive-scribble">{shortDescription}</span>
        </li>
    );
}

export { SlimDeckGrouping, RatedGrouping, SlimDeckList, LazyLoadedGrouping };
