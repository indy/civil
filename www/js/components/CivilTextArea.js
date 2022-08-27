import { html, useState, useEffect } from '/lib/preact/mod.js';
import { obtainKeyboard, relinquishKeyboard } from '/js/CivilUtils.js';
import { useStateValue } from '/js/StateProvider.js';

export default function CivilTextArea({id, value, elementRef, elementClass, onFocus, onBlur, onInput }) {
    const [state, dispatch] = useStateValue();


    function onTextAreaFocus() {
        obtainKeyboard(dispatch);
        onFocus && onFocus();
    }

    function onTextAreaBlur() {
        relinquishKeyboard(dispatch);
        onBlur && onBlur();
    }

    return html`
    <textarea id=${id}
              type="text"
              name=${id}
              value=${ value }
              ref=${elementRef}
              class=${elementClass}
              onFocus=${ onTextAreaFocus }
              onBlur=${ onTextAreaBlur }
              onInput=${ onInput } />
    `;
}
