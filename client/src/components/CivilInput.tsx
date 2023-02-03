import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { AppStateChange } from "../AppState";

export default function CivilInput({id, value, autoComplete, onInput, size, elementClass, readOnly, focus }: {id?: any, value?: any, autoComplete?: any, onInput?: any, size?: any, elementClass?: any, readOnly?: any, focus?: any }) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current && focus) {
            let c: HTMLElement = inputRef.current;
            c.focus();
        }
    }, []);

    const ac = autoComplete || "off";
    return (
      <input ref={inputRef}
             id={id}
             class={elementClass}
             type="text"
             name={id}
             value={ value }
             autoComplete={ac}
             size={ size }
             readOnly={ readOnly }
             onFocus={ AppStateChange.obtainKeyboardFn() }
             onBlur={ AppStateChange.relinquishKeyboardFn() }
             onInput={ onInput } />);
}
