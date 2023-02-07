import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { AppStateChange } from "../AppState";

export default function CivilInput({
    id,
    value,
    autoComplete,
    onInput,
    size,
    elementClass,
    readOnly,
    focus,
}: {
    id?: string;
    value?: string;
    autoComplete?: string;
    onInput?: (e: Event) => void;
    size?: number;
    elementClass?: string;
    readOnly?: boolean;
    focus?: boolean;
}) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current && focus) {
            let c: HTMLElement = inputRef.current;
            c.focus();
        }
    }, []);

    const ac = autoComplete || "off";
    return (
        <input
            ref={inputRef}
            id={id}
            class={elementClass}
            type="text"
            name={id}
            value={value}
            autoComplete={ac}
            size={size}
            readOnly={readOnly}
            onFocus={AppStateChange.obtainKeyboardFn()}
            onBlur={AppStateChange.relinquishKeyboardFn()}
            onInput={onInput}
        />
    );
}
