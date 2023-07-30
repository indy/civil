import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { AppStateChange } from "app-state";

export default function CivilInput({
    id,
    value,
    autoComplete,
    onContentChange,
    onReturnPressed,
    size,
    elementClass,
    readOnly,
    focus,
}: {
    id?: string;
    value?: string;
    autoComplete?: string;
    onContentChange?: (content: string, name: string) => void;
    onReturnPressed?: (content: string) => void;
    size?: number;
    elementClass?: string;
    readOnly?: boolean;
    focus?: boolean;
}) {
    const inputRef = useRef(null);

    function keyup(e: KeyboardEvent) {
        if (onReturnPressed && e.key === "Enter") {
            if (inputRef && inputRef.current) {
                let e = inputRef.current as HTMLInputElement;
                onReturnPressed(e.value);
            }
        }
    }

    useEffect(() => {
        if (inputRef.current) {
            if (focus) {
                let c: HTMLElement = inputRef.current;
                c.focus();
            }

            const elem = inputRef.current as HTMLElement;

            elem.addEventListener("keyup", keyup);
            return () => {
                elem.removeEventListener("keyup", keyup);
            };
        }
        return () => {}; // to please tsc
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

    function obtainKeyboard(event: Event) {
        event.preventDefault();
        AppStateChange.obtainKeyboard();
    }

    function relinquishKeyboard(event: Event) {
        event.preventDefault();
        AppStateChange.relinquishKeyboard();
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
            onFocus={obtainKeyboard}
            onBlur={relinquishKeyboard}
            onInput={onInput}
        />
    );
}
