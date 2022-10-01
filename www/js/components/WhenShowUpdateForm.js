import { html } from '/lib/preact/mod.js';
import { useAppState } from '/js/AppStateProvider.js';

export default function WhenShowUpdateForm({children}) {
    const appState = useAppState();

    return html`<div>${appState.deckManagerState.value.showUpdateForm && children}</div>`;
}
