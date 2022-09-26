import { html } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';

export default function WhenShowUpdateForm({children}) {
    const state = useStateValue();
    return html`<div>${state.deckManagerState.value.showUpdateForm && children}</div>`;
}
