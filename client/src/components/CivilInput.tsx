import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { AppStateChange } from "../AppState";

export default function CivilInput({
    id,
    value,
    autoComplete,
    onContentChange,
    size,
    elementClass,
    readOnly,
    focus,
}: {
    id?: string;
    value?: string;
    autoComplete?: string;
    onContentChange?: (content: string, name: string) => void;
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

    function onInput(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value = target.value;

            if (onContentChange) {
                onContentChange(value, name);
            }
        }
    }

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
