import { Link, html } from '/lib/preact/mod.js';

function Ref({ deckReference, extraClasses }) {
    if (deckReference) {
        const { id, resource, ref_kind, name, annotation } = deckReference;
        const href = `/${resource}/${id}`;
        // isg todo: how does the code after the annotation check work? the html isn't wrapped in a single div, there are 3 top-level divs????
        return html`
        <div class="${extraClasses}" key=${ id }>
            <span class="ref-kind">(${ ref_kind })</span>
            <${Link} class="ref pigment-${ resource }" href=${ href }>${ name }</${Link}>
            ${annotation && html`
            <div class="ref-clearer"/>
            <div class="ref-scribble pigment-fg-${ resource }">${ annotation }</div>
            <div class="ref-clearer"/>`}
        </div>`;
    } else {
        return html`<div></div>`
    }
}

export { Ref }
