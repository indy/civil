import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { DeckKind, DeckArticle, SlimDeck } from "types";
import { buildSlimDeck } from "../civil-utils";

import Net from "net";
import { svgExpand, svgMinimise } from "../svg-icons";

import DeckLink from "./deck-link";
import { ListingLink } from "./listing-link";
import { StarRating } from "./star-rating";

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
    let [show, setShow] = useState(expanded);

    function toggleShow() {
        setShow(!show);
    }

    if (hideEmpty && list && list.length === 0) {
        return <div></div>;
    } else if (show) {
        return (
            <div>
                <p class="subheading" onClick={toggleShow}>
                    {svgMinimise()} {label}
                </p>
                <ul class="compacted-list">{buildSlimDeckListing(list)}</ul>
            </div>
        );
    } else {
        return (
            <p class="subheading" onClick={toggleShow}>
                {svgExpand()} {label}
            </p>
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
            Net.get<Array<SlimDeck>>(url).then((d) => {
                setLocalState({
                    ...localState,
                    fetchedData: true,
                    list: d,
                    show: true,
                });
            });
        }
    }

    if (localState.show) {
        return (
            <div>
                <p class="subheading" onClick={toggleShow}>
                    {svgMinimise()} {label}
                </p>
                <ul class="compacted-list">
                    {buildSlimDeckListing(localState.list)}
                </ul>
            </div>
        );
    } else {
        return (
            <p class="subheading" onClick={toggleShow}>
                {svgExpand()} {label}
            </p>
        );
    }
}

type RatedGroupingProps = {
    label: string;
    list: Array<DeckArticle>;
    expanded?: boolean;
};

function RatedGrouping({ label, list, expanded }: RatedGroupingProps) {
    let [show, setShow] = useState(expanded);

    function toggleShow() {
        setShow(!show);
    }

    if (show) {
        return (
            <div>
                <p class="subheading" onClick={toggleShow}>
                    {svgMinimise()} {label}
                </p>
                <ul class="standard-list">{buildRatingListing(list)}</ul>
            </div>
        );
    } else {
        return (
            <p class="subheading" onClick={toggleShow}>
                {svgExpand()} {label}
            </p>
        );
    }
}

function buildListing(list: Array<SlimDeck>): Array<ComponentChildren> {
    return list.map((deck) => <ListingLink slimDeck={deck} />);
}

function buildSlimDeckListing(list: Array<SlimDeck>) {
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
    let { id, title, rating, shortDescription, insignia } = deck;
    let slimDeck = buildSlimDeck(DeckKind.Article, id, title, insignia);

    return (
        <li>
            <StarRating rating={rating} />
            <DeckLink slimDeck={slimDeck} />
            <span class="descriptive-scribble">{shortDescription}</span>
        </li>
    );
}

export { SlimDeckGrouping, RatedGrouping, SlimDeckList, LazyLoadedGrouping };
