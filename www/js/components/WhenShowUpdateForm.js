import { html } from '/lib/preact/mod.js';

export default function WhenShowUpdateForm({showUpdateForm, children}) {
    return html`<div>${showUpdateForm && children}</div>`;
}
