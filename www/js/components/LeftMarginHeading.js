import { html } from '/lib/preact/mod.js';

export default function LeftMarginHeading({children}) {
    return html`
    <div class="left-margin-entry">
        <div class="left-margin-heading">
            ${ children }
        </div>
    </div>`;
}
