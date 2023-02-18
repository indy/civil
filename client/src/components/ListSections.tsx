import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { DeckKind, DeckArticle, DeckSimple } from "../types";

import Net from "../Net";
import { svgExpand, svgMinimise } from "../svgIcons";

import DeckLink from "./DeckLink";
import { ListingLink } from "./ListingLink";
import { StarRating } from "./StarRating";

function DeckSimpleList({ list }: { list: Array<DeckSimple> }) {
    return (
        <div>
            <ul class="standard-list">{buildListing(list)}</ul>
        </div>
    );
}

type DeckSimpleListSectionProps = {
    label: string;
    list: Array<DeckSimple>;
    expanded?: boolean;
    hideEmpty?: boolean;
};
function DeckSimpleListSection({
    label,
    list,
    expanded,
    hideEmpty,
}: DeckSimpleListSectionProps) {
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
                <ul class="compacted-list">{buildDeckSimpleListing(list)}</ul>
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
        list: Array<DeckSimple>;
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
            Net.get<Array<DeckSimple>>(url).then((d) => {
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
                    {buildDeckSimpleListing(localState.list)}
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

function buildListing(list: Array<DeckSimple>): Array<ComponentChildren> {
    return list.map((deck) => (
        <ListingLink
            id={deck.id}
            name={deck.name}
            insignia={deck.insignia}
            deckKind={deck.deckKind}
        />
    ));
}

function buildDeckSimpleListing(list: Array<DeckSimple>) {
    return list.map((deck) => (
        <ListingLink
            id={deck.id}
            name={deck.name}
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
                name={title}
            />
            <span class="descriptive-scribble">{shortDescription}</span>
        </li>
    );
}

export {
    DeckSimpleListSection,
    RatedListSection,
    DeckSimpleList,
    LazyLoadedListSection,
};
