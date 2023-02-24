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
    onContentChange?: (s: string) => void;
};

export default function CivilTextArea({
    id,
    value,
    elementRef,
    elementClass,
    onFocus,
    onBlur,
    onContentChange,
}: Props) {
    function onTextAreaFocus() {
        AppStateChange.obtainKeyboardFn();
        onFocus && onFocus();
    }

    function onTextAreaBlur() {
        AppStateChange.relinquishKeyboardFn();
        onBlur && onBlur();
    }

    function onInput(event: Event) {
        if (event.target instanceof HTMLTextAreaElement) {
            const target = event.target;
            const value = target.value;

            if (onContentChange) {
                onContentChange(value);
            }
        }
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
