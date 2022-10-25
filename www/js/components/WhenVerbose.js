import { html } from '/lib/preact/mod.js';

import { getAppState } from '/js/AppState.js';

export default function WhenVerbose({children}) {
    const appState = getAppState();
    return html`<div>${appState.verboseUI.value && children}</div>`;
}
