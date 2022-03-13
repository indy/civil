import { html, useState, useEffect } from '/lib/preact/mod.js';
import { obtainKeyboard, relinquishKeyboard } from '/js/CivilUtils.js';
import { useStateValue } from '/js/StateProvider.js';

export default function CivilInput({id, value, autoComplete, onInput, size, readOnly }) {
    const [state, dispatch] = useStateValue();

    return html`
      <input id=${id}
             type="text"
             name=${id}
             value=${ value }
             autoComplete=${autoComplete}
             size=${ size }
             readOnly=${ readOnly }
             onFocus=${ obtainKeyboard(dispatch) }
             onBlur=${ relinquishKeyboard(dispatch) }
             onInput=${ onInput } />
    `;
}
