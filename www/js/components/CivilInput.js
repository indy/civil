import { html, useState, useEffect } from '/lib/preact/mod.js';
import { AppStateChange } from '/js/AppState.js';

export default function CivilInput({id, value, autoComplete, onInput, size, elementClass, readOnly }) {
    return html`
      <input id=${id}
             class=${elementClass}
             type="text"
             name=${id}
             value=${ value }
             autoComplete=${autoComplete}
             size=${ size }
             readOnly=${ readOnly }
             onFocus=${ AppStateChange.obtainKeyboardFn() }
             onBlur=${ AppStateChange.relinquishKeyboardFn() }
             onInput=${ onInput } />
    `;
}
