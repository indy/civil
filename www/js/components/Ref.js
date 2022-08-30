import { Link, html, useState } from '/lib/preact/mod.js';

function Ref({ deckReference, extraClasses }) {
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

        // isg todo: how does the code after the annotation check work? the html isn't wrapped in a single div, there are 3 top-level divs????
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

export { Ref }
