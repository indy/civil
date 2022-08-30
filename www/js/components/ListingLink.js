import { html, Link, useState } from '/lib/preact/mod.js';

import { svgCaretRight, svgCaretDown } from '/js/svgIcons.js';
import { useStateValue } from '/js/StateProvider.js';

import buildMarkup from '/js/components/BuildMarkup.js';

function ListingLink({ resource, id, name }) {
    const href = `/${resource}/${id}`;

    let res = html`
    <li class="listing-link">
        <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
    </li>`;

    return res;
};

function ExpandableListingLink({ index, resource, deck_id, deck_name, deck_level_refs, notes, expanded, onExpandClick }) {
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
        ${ expanded && buildDeckLevelBackRefs(deck_level_refs) }
        ${ expanded && buildNotes(notes) }
    </div>`;

    return res;
};

function buildDeckLevelBackRefs(deck_level_refs) {
    let refs = deck_level_refs.map(r => html`
    <div class="deck-level-backref">
        <span class="ref-kind">(${ r.ref_kind })</span>
        <${Link} class="ref pigment-${ r.resource }" href="/${r.resource}/${r.deck_id}">${ r.deck_name }</${Link}>
        ${ r.annotation && html`<span class="ref-scribble pigment-fg-${ r.resource }">${ r.annotation }</span>`}
    </div>`);

    return html`<div>${ refs }</div>`;
}

function buildNotes(notes) {
    const [state] = useStateValue();

    let res = notes.reduce((a, note) => {
        if (note.top_annotation) {
            a.push(html`<div class="ref-top-scribble">
                            ${ note.top_annotation }
                        </div>`);
        }

        let refs = note.refs && note.refs.map(r => html`
        <div class="left-margin-entry">
            <span class="ref-kind">(${ r.ref_kind })</span>
            <${Link} class="ref pigment-${ r.resource }" href="/${r.resource}/${r.deck_id}">${ r.deck_name }</${Link}>
            ${ r.annotation && html`
                <div class="ref-scribble pigment-fg-${ r.resource }">
                    ${ r.annotation }
                </div>`}
        </div>
      `);

        a.push(html`
        <div class="note">
            ${ note.refs && html`
                <div class="left-margin">
                    ${ refs }
                </div>`}
            <div>
                 ${ buildMarkup(note.note_content, state.imageDirectory) }
            </div>
        </div>
    `);

        a.push(html`<hr/>`);
        return a;
    }, []).slice(0, -1);          // the slice removes the final hr tag

    return html`<div>${res}</div>`;
}

export { ListingLink, ExpandableListingLink };
