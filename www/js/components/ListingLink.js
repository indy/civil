import { html, Link, useState } from '/lib/preact/mod.js';

import { svgCaretRight, svgCaretDown } from '/js/svgIcons.js';
import { useStateValue } from '/js/StateProvider.js';
import { Ref } from '/js/components/Ref.js';

import buildMarkup from '/js/components/BuildMarkup.js';

function ListingLink({ resource, id, name }) {
    const href = `/${resource}/${id}`;

    let res = html`
    <li class="listing-link">
        <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
    </li>`;

    return res;
};

function ExpandableListingLink({ index, resource, deck_id, deck_name, deck_level_refs, deck_level_annotation, notes, expanded, onExpandClick }) {
    function onClicked(e) {
        e.preventDefault();
        onExpandClick(index);
    }

    const href = `/${resource}/${deck_id}`;

    let icon = expanded ? svgCaretDown() : svgCaretRight();

    let res = html`
    <div>
        <span onClick=${onClicked}>${ icon }</span>
        <span class="backref-deck">
            <${Link} class="pigment-fg-${resource}" href=${ href }>${ deck_name }</${Link}>
        </span>
        ${ expanded && deck_level_annotation && buildDeckLevelAnnotation(deck_level_annotation) }
        ${ expanded && buildDeckLevelBackRefs(deck_level_refs) }
        ${ expanded && buildNotes(notes) }
    </div>`;

    return res;
};

function buildDeckLevelAnnotation(deck_level_annotation) {
    return html`<div class="ref-top-scribble indented">${ deck_level_annotation }</div>`;
}

function buildDeckLevelBackRefs(deck_level_refs) {
    let refs = deck_level_refs.map(r => html`
        <${Ref} deckReference=${r} extraClasses="deck-level-backref"/>
    `);

    return html`<div>${ refs }</div>`;
}

function buildNotes(notes) {
    const [state] = useStateValue();

    let res = notes.reduce((a, note) => {
        if (note.top_annotation) {
            a.push(html`<div class="ref-top-scribble">${ note.top_annotation }</div>`);
        }

        let refs = note.refs && note.refs.map(r => {
            return html`<${Ref} deckReference=${r} extraClasses="left-margin-entry"/>`;
        });

        a.push(html`
            <div class="note">
                ${ note.refs && html`<div class="left-margin">${ refs }</div>`}
                ${ buildMarkup(note.note_content, state.imageDirectory) }
            </div>`);

        a.push(html`<hr/>`);
        return a;
    }, []).slice(0, -1);          // the slice removes the final hr tag

    return html`<div>${res}</div>`;
}

export { ListingLink, ExpandableListingLink };
