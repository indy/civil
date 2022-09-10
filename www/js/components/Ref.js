import { Link, html, useState } from '/lib/preact/mod.js';

export default function Ref({ deckReference, extraClasses }) {
    const [expanded, setExpanded] = useState(true);

    if (deckReference) {
        const { id, resource, ref_kind, name, annotation } = deckReference;
        const href = `/${resource}/${id}`;

        // clicked on the ref kind label toggles the annotation
        function clickedToggleAnnotation(e) {
            if (annotation) {
                setExpanded(!expanded);
            }
        }

        return html`
        <div class="${extraClasses}" key=${ id }>
            <span class="ref-kind" onClick=${clickedToggleAnnotation}>(${ ref_kind })${!expanded && '+'}</span>
            <${Link} class="ref pigment-${ resource }" href=${ href }>${ name }</${Link}>
            ${annotation && expanded && html`<div class="ref-scribble pigment-fg-${ resource }">${ annotation }</div>`}
        </div>`;
    } else {
        return html`<div></div>`
    }
}
