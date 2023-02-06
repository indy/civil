import { h, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { IArticle, IDeckSimple } from "../types";

import Net from "../Net";
import { svgExpand, svgMinimise } from "../svgIcons";

import DeckLink from "./DeckLink";
import { ListingLink } from "./ListingLink";
import { StarRating } from "./StarRating";

function DeckSimpleList({ list }: { list: Array<IDeckSimple> }) {
    return (
        <div>
            <ul class="standard-list">{buildListing(list)}</ul>
        </div>
    );
}

type DeckSimpleListSectionProps = {
    label: string;
    list: Array<IDeckSimple>;
    expanded?: boolean;
    hideEmpty?: boolean;
}
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

function LazyLoadedListSection({ label, url }: { label: string; url: string }) {

    type LocalStateType = {
        fetchedData: boolean;
        list: Array<IDeckSimple>;
        show: boolean;
    };

    let initialState: LocalStateType = {
        fetchedData: false,
        list: [],
        show: false,
    };
    let [localState, setLocalState]: [localState: LocalStateType, setLocalState: any] =
        useState(initialState);

    function toggleShow() {
        const visible = !localState.show;
        setLocalState({
            ...localState,
            show: visible,
        });
        if (visible && !localState.fetchedData) {
            Net.get<Array<IDeckSimple>>(url).then(d => {
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
    list: Array<IArticle>;
    resource: string;
    expanded?: boolean;
}

function RatedListSection({
    label,
    list,
    resource,
    expanded,
}: RatedListSectionProps) {
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
                <ul class="standard-list">
                    {buildRatingListing(list, resource)}
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

function buildListing(
    list: Array<IDeckSimple>,
    resource?: string
): Array<ComponentChildren> {
    return list.map((deck) => (
        <ListingLink
            id={deck.id}
            name={deck.title || deck.name}
            insignia={deck.insignia}
            resource={resource || deck.resource}
        />
    ));
}

function buildDeckSimpleListing(list: Array<IDeckSimple>) {
    return list.map((deck) => (
        <ListingLink
            id={deck.id}
            name={deck.title || deck.name}
            insignia={deck.insignia}
            resource={deck.resource}
        />
    ));
}

function buildRatingListing(list: Array<IArticle>, resource: string) {
    if (!list) {
        return [];
    }
    return list.map((deck) => (
        <RatedListingLink deck={deck} resource={resource} />
    ));
}

// based off ListingLink but displays a star rating in the left hand margin
//
function RatedListingLink({ deck, resource }: { deck: IArticle; resource: string }) {
        let { id, title, rating, shortDescription, insignia } = deck;
        const href = `/${resource}/${id}`;

        return (
            <li>
                <StarRating rating={rating} />
                <DeckLink
                    resource={resource}
                    href={href}
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
