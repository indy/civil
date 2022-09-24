import { html } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';

export default function WhenVerbose({children}) {
    const state = useStateValue();
    return html`<div>${state.verboseUI.value && children}</div>`;
}
