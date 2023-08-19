import { h, ComponentChildren } from "preact";
import { useState, useEffect } from "preact/hooks";

import { DeckKind, DeckArticle, SlimDeck, ResultList } from "types";
import { buildSlimDeck } from "shared/deck";

import Net from "shared/net";

import DeckLink from "components/deck-link";
import ListingLink from "components/listing-link";
import { StarRatingWithinListing } from "components/star-rating";
import Toggler from "components/toggler";

function SlimDeckList({
    list,
    extraClasses,
}: {
    list: Array<SlimDeck>;
    extraClasses?: string;
}) {
    const klass = extraClasses
        ? `standard-list ${extraClasses}`
        : "standard-list";
    return <ul class={klass}>{buildListing(list)}</ul>;
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

type EagerLoadedGroupingProps = {
    url: string;
};

function EagerLoadedGrouping({ url }: EagerLoadedGroupingProps) {
    type State = {
        fetchedData: boolean;
        list: Array<SlimDeck>;
    };

    let initialState: State = {
        fetchedData: false,
        list: [],
    };
    let [localState, setLocalState] = useState(initialState);

    useEffect(() => {
        console.log("eager");
        Net.get<ResultList>(url).then((resultList) => {
            setLocalState({
                ...localState,
                fetchedData: true,
                list: resultList.results,
            });
        });
    }, []);

    return (
        <ul class="compacted-list">{buildListing(localState.list)}</ul>
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

export { SlimDeckGrouping, RatedGrouping, SlimDeckList, EagerLoadedGrouping };
