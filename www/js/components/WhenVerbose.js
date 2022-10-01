import { html } from '/lib/preact/mod.js';
import { useAppState } from '/js/AppStateProvider.js';

export default function WhenVerbose({children}) {
    const appState = useAppState();
    return html`<div>${appState.verboseUI.value && children}</div>`;
}
