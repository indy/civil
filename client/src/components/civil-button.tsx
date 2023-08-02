import { h, ComponentChildren } from "preact";

export default function CivilButton({
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
    let classes = "civil-button ";
    if (extraClasses) {
        classes += extraClasses;
    }

    function onButtonClicked() {
        if (onClick) {
            onClick();
        }
    }
    console.log(disabled);
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
