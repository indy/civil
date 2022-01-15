import { html } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import { svgLock } from '/js/svgIcons.js';

function WhenWritable({children}) {
  const [state] = useStateValue();
  return html`<div>${!state.readOnly && children}</div>`;
}

function WhenWritableToggle() {
  const [state, dispatch] = useStateValue();

  function lockToggle(e) {
    e.preventDefault();
    dispatch({ type: 'toggleLock'});
  }

  return html`<span onClick=${ lockToggle }>
                ${ state.readOnly && svgLock() }
              </span>`;
}

export {WhenWritable, WhenWritableToggle}
