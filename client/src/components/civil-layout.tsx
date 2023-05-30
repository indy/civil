import { h, ComponentChildren } from "preact";

export function CivContainer({
    extraClasses,
    children,
}: {
    extraClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "muh-container ";
    if (extraClasses) {
        classes += extraClasses;
    }

    return <div class={classes}>{children}</div>;
}

export function CivMain({
    extraClasses,
    children,
}: {
    extraClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "muh-content ";
    if (extraClasses) {
        classes += extraClasses;
    }

    return <div class={classes}>{children}</div>;
}

export function CivLeft({
    extraClasses,
    children,
}: {
    extraClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "left-margin ";
    if (extraClasses) {
        classes += extraClasses;
    }

    return <div class={classes}>{children}</div>;
}
