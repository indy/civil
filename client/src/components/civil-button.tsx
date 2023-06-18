import { h, ComponentChildren } from "preact";

export default function CivilButton({
    extraClasses,
    onClick,
    children,
}: {
    extraClasses?: string;
    onClick?: () => void;
    children: ComponentChildren;
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

    return (
        <button onClick={onButtonClicked} type="button" class={classes}>
            {children}
        </button>
    );
}
