import { html } from '/lib/preact/mod.js';
import { getAppState } from '/js/AppStateProvider.js';

export default function WhenShowUpdateForm({children}) {
    const appState = getAppState();

    return html`<div>${appState.deckManagerState.value.showUpdateForm && children}</div>`;
}
