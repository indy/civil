import { html, useState, Link } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import { ListingLink } from '/js/components/ListingLink.js';
import { StarRating } from '/js/components/StarRating.js';
import { svgExpand, svgMinimise } from '/js/svgIcons.js';

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

function DeckSimpleListSection({label, list, expanded, hideEmpty }) {
    let [show, setShow] = useState(expanded);

    function toggleShow() {
        setShow(!show);
    }

    if(hideEmpty && list && list.length === 0) {
        return html``;
    } else if(show) {
        return html`
        <div>
            <p class="subheading" onClick=${ toggleShow }>
                ${ svgMinimise() } ${ label }
            </p>
            <ul class="compacted-list" >
                ${ buildDeckSimpleListing(list) }
            </ul>
        </div>`;
    } else {
        return html`
        <p class="subheading" onClick=${ toggleShow }>
            ${ svgExpand() } ${ label }
        </p>`;
    }
}

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
                    resource=${resource || deck.resource }/>`);
}

function buildDeckSimpleListing(list) {
    if (!list) {
        return [];
    }
    return list.map((deck, i) => html`
    <${ListingLink} id=${ deck.id }
                    name=${ deck.title || deck.name }
                    resource=${deck.resource}/>`);
}

function buildRatingListing(list, resource) {
    if (!list) {
        return [];
    }
    return list.map((deck, i) => html`
    <${RatedListingLink} id=${ deck.id }
                         name=${ deck.title }
                         resource=${resource}
                         rating=${deck.rating}
                         description=${deck.shortDescription}/>`);
}

// based off ListingLink but displays a star rating in the left hand margin
//
function RatedListingLink({ resource, id, name, rating, description }) {
    const href = `/${resource}/${id}`;

    let res = html`
    <li>
        <${StarRating} rating=${rating}/>
        <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
        <span class="descriptive-scribble">${description}</span>
    </li>`;

    return res;
}

export { DeckSimpleListSection, RatedListSection, BasicListSection, DeckSimpleList, LazyLoadedListSection };
