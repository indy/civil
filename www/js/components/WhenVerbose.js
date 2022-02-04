import { html } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';

function WhenVerbose({children}) {
    const [state] = useStateValue();
    return html`<div>${state.verboseUI && children}</div>`;
}

export { WhenVerbose }
