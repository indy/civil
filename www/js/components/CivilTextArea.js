import { html, useState, useEffect } from '/lib/preact/mod.js';
import { obtainKeyboard, relinquishKeyboard } from '/js/AppState.js';
import { useStateValue } from '/js/StateProvider.js';

export default function CivilTextArea({id, value, elementRef, elementClass, onFocus, onBlur, onInput }) {
    const state = useStateValue();


    function onTextAreaFocus() {
        obtainKeyboard(state);
        onFocus && onFocus();
    }

    function onTextAreaBlur() {
        relinquishKeyboard(state);
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
