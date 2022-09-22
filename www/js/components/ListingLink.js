import { html, Link, useState } from '/lib/preact/mod.js';

import { svgCaretRight, svgCaretDown } from '/js/svgIcons.js';
import Ref from '/js/components/Ref.js';

import buildMarkup from '/js/components/BuildMarkup.js';

function ListingLink({ resource, id, name }) {
    const href = `/${resource}/${id}`;

    let res = html`
    <li class="listing-link">
        <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
    </li>`;

    return res;
};

function ExpandableListingLink({ index, resource, deckId, deckName, deckLevelRefs, deckLevelAnnotation, notes, expanded, onExpandClick }) {
    function onClicked(e) {
        e.preventDefault();
        onExpandClick(index);
    }

    const href = `/${resource}/${deckId}`;

    let icon = expanded ? svgCaretDown() : svgCaretRight();

    let res = html`
    <div>
        <span onClick=${onClicked}>${ icon }</span>
        <span class="backref-deck">
            <${Link} class="pigment-fg-${resource}" href=${ href }>${ deckName }</${Link}>
        </span>
        ${ expanded && deckLevelAnnotation && buildDeckLevelAnnotation(deckLevelAnnotation) }
        ${ expanded && buildDeckLevelBackRefs(deckLevelRefs) }
        ${ expanded && buildNotes(notes) }
    </div>`;

    return res;
};

function buildDeckLevelAnnotation(deckLevelAnnotation) {
    return html`<div class="ref-top-scribble indented">${ deckLevelAnnotation }</div>`;
}

function buildDeckLevelBackRefs(deckLevelRefs) {
    let refs = deckLevelRefs.map(r => html`
        <${Ref} deckReference=${r} extraClasses="deck-level-backref"/>
    `);

    return html`<div>${ refs }</div>`;
}

function buildNotes(notes) {
    let res = notes.reduce((a, note) => {
        if (note.topAnnotation) {
            a.push(html`<div class="ref-top-scribble">${ note.topAnnotation }</div>`);
        }

        let refs = note.refs && note.refs.map(r => {
            return html`<${Ref} deckReference=${r} extraClasses="left-margin-entry"/>`;
        });

        a.push(html`
            <div class="note">
                ${ note.refs && html`<div class="left-margin">${ refs }</div>`}
                ${ buildMarkup(note.noteContent) }
            </div>`);

        a.push(html`<hr/>`);
        return a;
    }, []).slice(0, -1);          // the slice removes the final hr tag

    return html`<div>${res}</div>`;
}

export { ListingLink, ExpandableListingLink };
