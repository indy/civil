import { h } from "preact";
import { Ref } from "preact/hooks";

import { AppStateChange } from "../AppState";

type Props = {
    id?: string;
    value: string;
    elementRef?: Ref<HTMLTextAreaElement>;
    elementClass?: string;
    onFocus?: () => void;
    onBlur?: (e?: Event) => void;
    onInput?: (e: Event) => void;
};

export default function CivilTextArea({
    id,
    value,
    elementRef,
    elementClass,
    onFocus,
    onBlur,
    onInput,
}: Props) {
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
