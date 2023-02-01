import { h } from "preact";
// import { Link } from "preact-router";
import { useState } from "preact/hooks";

// import Net from '../Net';
import { svgExpand, svgMinimise } from '../svgIcons';

// import DeckLink from './DeckLink';
import { ListingLink } from './ListingLink';
// import { StarRating } from './StarRating';

/*
function BasicListSection({list, resource}) {
    return html`
    <div>
        <ul class="standard-list" >
            ${ buildListing(list, resource) }
        </ul>
    </div>`;
}

function DeckSimpleList({list}) {
    return html`
    <div>
        <ul class="standard-list" >
            ${ buildListing(list) }
        </ul>
    </div>`;
}
*/
function DeckSimpleListSection({label, list, expanded, hideEmpty }: {label: any, list: any, expanded?: any, hideEmpty?: any }) {
    let [show, setShow] = useState(expanded);

    function toggleShow() {
        setShow(!show);
    }

    if(hideEmpty && list && list.length === 0) {
        return (<div></div>)
    } else if(show) {
        return (
        <div>
            <p class="subheading" onClick={ toggleShow }>
                { svgMinimise() } { label }
            </p>
            <ul class="compacted-list" >
                { buildDeckSimpleListing(list) }
            </ul>
        </div>);
    } else {
        return (
        <p class="subheading" onClick={ toggleShow }>
            { svgExpand() } { label }
        </p>);
    }
}
/*
function LazyLoadedListSection({label, url }) {
    // list, expanded, hideEmpty, onToggle
    let [localState, setLocalState] = useState({
        fetchedData: false,
        list: [],
        show: false
    });

    function toggleShow() {
        const visible = !localState.show;
        setLocalState({
            ...localState,
            show: visible
        });
        if (visible && !localState.fetchedStats) {
            Net.get(url).then(d => {
                setLocalState({
                    ...localState,
                    fetchedStats: true,
                    list: d,
                    show: true
                });
            });
        }
    }

    if(localState.show) {
        return html`
        <div>
            <p class="subheading" onClick=${ toggleShow }>
                ${ svgMinimise() } ${ label }
            </p>
            <ul class="compacted-list" >
                ${ buildDeckSimpleListing(localState.list) }
            </ul>
        </div>`;
    } else {
        return html`
        <p class="subheading" onClick=${ toggleShow }>
            ${ svgExpand() } ${ label }
        </p>`;
    }
}


function RatedListSection({label, list, resource, expanded}) {
    let [show, setShow] = useState(expanded);

    function toggleShow() {
        setShow(!show);
    }

    if(show) {
        return html`
        <div>
            <p class="subheading" onClick=${ toggleShow }>
                ${ svgMinimise() } ${ label }
            </p>
            <ul class="standard-list" >
                ${ buildRatingListing(list, resource) }
            </ul>
        </div>`;
    } else {
        return html`
        <p class="subheading" onClick=${ toggleShow }>
            ${ svgExpand() } ${ label }
        </p>`;
    }
}

function buildListing(list, resource) {
    if (!list) {
        return [];
    }
    return list.map((deck, i) => html`
    <${ListingLink} id=${ deck.id }
                    name=${ deck.title || deck.name }
                    insignia=${ deck.insignia }
                    resource=${resource || deck.resource }/>`);
}
*/
function buildDeckSimpleListing(list) {
    if (!list) {
        return [];
    }
    return list.map((deck, i) => (
    <ListingLink id={ deck.id }
                    name={ deck.title || deck.name }
                    insignia={ deck.insignia }
                    resource={deck.resource}/>));
}
/*
function buildRatingListing(list, resource) {
    if (!list) {
        return [];
    }
    return list.map((deck, i) => html`
    <${RatedListingLink} deck=${deck}
                         resource=${resource}
                         description=${deck.shortDescription}/>`);
}

// based off ListingLink but displays a star rating in the left hand margin
//
function RatedListingLink({ deck, resource }) {
    if (deck) {
        let { id, title, rating, shortDescription, insignia } = deck;
        const href = `/${resource}/${id}`;

        return html`
        <li>
            <${StarRating} rating=${rating}/>
            <${DeckLink} resource=${resource}
                         href=${href}
                         insignia=${insignia}
                         name=${title}/>
            <span class="descriptive-scribble">${shortDescription}</span>
        </li>`;
    } else {
        return html`<li></li>`;
    }
}
*/
export { DeckSimpleListSection/*, RatedListSection, BasicListSection, DeckSimpleList, LazyLoadedListSection*/ };
