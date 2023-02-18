import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { DeckKind, DeckArticle, SlimDeck } from "../types";

import Net from "../Net";
import { svgExpand, svgMinimise } from "../svgIcons";

import DeckLink from "./DeckLink";
import { ListingLink } from "./ListingLink";
import { StarRating } from "./StarRating";

function SlimDeckList({ list }: { list: Array<SlimDeck> }) {
    return (
        <div>
            <ul class="standard-list">{buildListing(list)}</ul>
        </div>
    );
}

type SlimDeckListSectionProps = {
    label: string;
    list: Array<SlimDeck>;
    expanded?: boolean;
    hideEmpty?: boolean;
};
function SlimDeckListSection({
    label,
    list,
    expanded,
    hideEmpty,
}: SlimDeckListSectionProps) {
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

type LazyLoadedListSectionProps = {
    label: string;
    url: string;
};

function LazyLoadedListSection({ label, url }: LazyLoadedListSectionProps) {
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

type RatedListSectionProps = {
    label: string;
    list: Array<DeckArticle>;
    expanded?: boolean;
};

function RatedListSection({ label, list, expanded }: RatedListSectionProps) {
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
    return list.map((deck) => (
        <ListingLink
            id={deck.id}
            title={deck.title}
            insignia={deck.insignia}
            deckKind={deck.deckKind}
        />
    ));
}

function buildSlimDeckListing(list: Array<SlimDeck>) {
    return list.map((deck) => (
        <ListingLink
            id={deck.id}
            title={deck.title}
            insignia={deck.insignia}
            deckKind={deck.deckKind}
        />
    ));
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
    let deckKind: DeckKind = DeckKind.Article;

    return (
        <li>
            <StarRating rating={rating} />
            <DeckLink
                deckKind={deckKind}
                id={id}
                insignia={insignia}
                title={title}
            />
            <span class="descriptive-scribble">{shortDescription}</span>
        </li>
    );
}

export {
    SlimDeckListSection,
    RatedListSection,
    SlimDeckList,
    LazyLoadedListSection,
};
