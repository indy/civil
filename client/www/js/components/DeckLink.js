import { Link, html } from '/lib/preact/mod.js';

import { renderInsignia } from '/js/components/Insignias.js';

export default function DeckLink({ extraClasses, onClick, resource, href, insignia, name, children}) {
    function clicked(e) {
        if (onClick) {
            onClick(e)
        }
    }

    return html`
    <${Link} class="${ extraClasses } pigment-fg-${resource}"
             href=${ href }
             onClick=${clicked}>
        ${ children }
        ${ renderInsignia(insignia) }
        ${ name }
    </${Link}>`;
}
