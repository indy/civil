import { html, useState, useEffect } from '/lib/preact/mod.js';
import { obtainKeyboard, relinquishKeyboard } from '/js/CivilUtils.js';
import { useStateValue } from '/js/StateProvider.js';

export default function CivilTextArea({id, value, elementRef, elementClass, onInput }) {
    const [state, dispatch] = useStateValue();

    return html`
    <textarea id=${id}
              type="text"
              name=${id}
              value=${ value }
              ref=${elementRef}
              class=${elementClass}
              onFocus=${ obtainKeyboard(dispatch) }
              onBlur=${ relinquishKeyboard(dispatch) }
              onInput=${ onInput } />
    `;
}
