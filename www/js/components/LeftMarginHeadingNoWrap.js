import { html } from '/lib/preact/mod.js';

export default function LeftMarginHeadingNoWrap({children}) {
    return html`
    <div class="left-margin-entry-no-wrap">
        <div class="left-margin-heading">
            ${ children }
        </div>
    </div>`;
}
