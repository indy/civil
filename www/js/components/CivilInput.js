import { html } from '/lib/preact/mod.js';
import { AppStateChange } from '/js/AppState.js';

export default function CivilInput({id, value, autoComplete, onInput, size, elementClass, readOnly }) {
    const ac = autoComplete || "off";
    return html`
      <input id=${id}
             class=${elementClass}
             type="text"
             name=${id}
             value=${ value }
             autoComplete=${ac}
             size=${ size }
             readOnly=${ readOnly }
             onFocus=${ AppStateChange.obtainKeyboardFn() }
             onBlur=${ AppStateChange.relinquishKeyboardFn() }
             onInput=${ onInput } />
    `;
}
