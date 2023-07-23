import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { DeckKind, DeckArticle, SlimDeck, ResultList } from "types";
import { buildSlimDeck } from "utils/civil";

import Net from "utils/net";
import { svgExpand, svgMinimise } from "components/svg-icons";

import DeckLink from "components/deck-link";
import ListingLink from "components/listing-link";
import { StarRatingWithinListing } from "components/star-rating";
import { CivMain, CivContainer } from "components/civil-layout";

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
    } else {
        return (
            <div>
                <p class="subheading ui" onClick={toggleShow}>
                    {show ? svgMinimise() : svgExpand()} {label}
                </p>
                {show && <ul class="compacted-list">{buildListing(list)}</ul>}
            </div>
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

    if (localState.show) {
        return (
            <div>
                <p class="subheading ui" onClick={toggleShow}>
                    {svgMinimise()} {label}
                </p>
                <ul class="compacted-list">{buildListing(localState.list)}</ul>
            </div>
        );
    } else {
        return (
            <p class="subheading ui" onClick={toggleShow}>
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
                <p class="subheading ui" onClick={toggleShow}>
                    {svgMinimise()} {label}
                </p>
                <ul class="standard-list">{buildRatingListing(list)}</ul>
            </div>
        );
    } else {
        return (
            <p class="subheading ui" onClick={toggleShow}>
                {svgExpand()} {label}
            </p>
        );
    }
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
    let { id, title, rating, shortDescription, insignia, typeface } = deck;
    let slimDeck = buildSlimDeck(
        DeckKind.Article,
        id,
        title,
        insignia,
        typeface
    );

    return (
        <li>
            <CivContainer>
                <CivMain>
                    <StarRatingWithinListing rating={rating} />
                    <DeckLink slimDeck={slimDeck} />
                    <span class="descriptive-scribble">{shortDescription}</span>
                </CivMain>
            </CivContainer>
        </li>
    );
}

export { SlimDeckGrouping, RatedGrouping, SlimDeckList, LazyLoadedGrouping };
