import { html, useState, useEffect } from '/lib/preact/mod.js';
import { obtainKeyboard, relinquishKeyboard } from '/js/CivilUtils.js';
import { useStateValue } from '/js/StateProvider.js';

export default function CivilTextArea({id, value, ref, klass, onInput }) {
    const [state, dispatch] = useStateValue();

    return html`
      <textarea id=${id}
                type="text"
                name=${id}
                value=${ value }
                ref=${ref}
                class=${klass}
                onFocus=${ obtainKeyboard(dispatch) }
                onBlur=${ relinquishKeyboard(dispatch) }
                onInput=${ onInput } />
    `;
}
