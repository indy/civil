import { ComponentChildren, h } from "preact";

export default function CivilTabButton({
    extraClasses,
    onClick,
    children,
    disabled,
}: {
    extraClasses?: string;
    onClick?: () => void;
    children: ComponentChildren;
    disabled?: boolean;
}) {
    let classes = "c-civil-tab-button ";
    if (extraClasses) {
        classes += extraClasses;
    }

    function onButtonClicked() {
        if (onClick) {
            onClick();
        }
    }

    return (
        <button
            onClick={onButtonClicked}
            type="button"
            class={classes}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
