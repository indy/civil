import { html } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';

export default function WhenWritable({children}) {
  const [state] = useStateValue();
  return html`<div>${!state.readOnly && children}</div>`;
}
