import { h } from "preact";
import { AppStateChange } from "../AppState";

export default function CivilTextArea({
    id,
    value,
    elementRef,
    elementClass,
    onFocus,
    onBlur,
    onInput,
}: {
    id?: any;
    value?: any;
    elementRef?: any;
    elementClass?: any;
    onFocus?: any;
    onBlur?: any;
    onInput?: any;
}) {
    function onTextAreaFocus() {
        AppStateChange.obtainKeyboardFn();
        onFocus && onFocus();
    }

    function onTextAreaBlur() {
        AppStateChange.relinquishKeyboardFn();
        onBlur && onBlur();
    }

    return (
        <textarea
            id={id}
            type="text"
            name={id}
            value={value}
            ref={elementRef}
            class={elementClass}
            onFocus={onTextAreaFocus}
            onBlur={onTextAreaBlur}
            onInput={onInput}
        />
    );
}
