import { html, useRef, useEffect } from '/lib/preact/mod.js';
import { AppStateChange } from '/js/AppState.js';

export default function CivilInput({id, value, autoComplete, onInput, size, elementClass, readOnly, focus }) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current && focus) {
            inputRef.current.focus();
        }
    }, []);

    const ac = autoComplete || "off";
    return html`
      <input ref=${inputRef}
             id=${id}
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
