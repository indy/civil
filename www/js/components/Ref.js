import { Link, html, useState } from '/lib/preact/mod.js';

import DeckLink from '/js/components/DeckLink.js';

export default function Ref({ deckReference, extraClasses }) {
    const [expanded, setExpanded] = useState(true);

    if (deckReference) {
        const { id, resource, refKind, name, annotation, insignia } = deckReference;
        const href = `/${resource}/${id}`;

        // clicked on the ref kind label toggles the annotation
        function clickedToggleAnnotation(e) {
            if (annotation) {
                setExpanded(!expanded);
            }
        }

        return html`
        <div class="${extraClasses}" key=${ id }>
            <span class="ref-kind" onClick=${clickedToggleAnnotation}>(${ refKind })${!expanded && '+'}</span>

            <${DeckLink} extraClasses="ref"
                         resource=${resource}
                         href=${ href }
                         insignia=${ insignia }
                         name=${ name }/>

            ${annotation && expanded && html`<div class="ref-scribble pigment-fg-${ resource }">${ annotation }</div>`}
        </div>`;
    } else {
        return html`<div></div>`
    }
}
