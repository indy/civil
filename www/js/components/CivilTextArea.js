import { html, useState, useEffect } from '/lib/preact/mod.js';
import { AppStateChange } from '/js/AppState.js';

export default function CivilTextArea({id, value, elementRef, elementClass, onFocus, onBlur, onInput }) {
    function onTextAreaFocus() {
        AppStateChange.obtainKeyboardFn();
        onFocus && onFocus();
    }

    function onTextAreaBlur() {
        AppStateChange.relinquishKeyboardFn();
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
