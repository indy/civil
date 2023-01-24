import { html } from '/lib/preact/mod.js';

import { nonEmptyArray, plural } from '/js/JsUtils.js';

import RollableSection from '/js/components/RollableSection.js';
import { ListingLink } from '/js/components/ListingLink.js';

export default function SectionSearchResultsBackref({ backrefs }) {
    function buildBackref(lb) {
        return (
            html`<${ListingLink} id=${ lb.id }
                                 insignia=${ lb.insignia }
                                 name=${ lb.name }
                                 resource=${ lb.resource }/>`
        );
    }

    if(nonEmptyArray(backrefs)) {
        const heading = plural(backrefs.length, 'Additional Search Result', 's');
        return html`
        <${RollableSection} heading=${ heading } initiallyRolledUp>
            <ul>
                ${ backrefs.map(buildBackref) }
            </ul>
        </${RollableSection}>`;
    } else {
        return html`<div></div>`;
    }
}
