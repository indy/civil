import { h, ComponentChildren } from "preact";

/*

CivContainer contains many CivLeft and CivMain child components
CivLeft is a sibling of CivMain
CivMain can contain many CivRight child components

Note: CivLeft's parent should be a CivContainer, and CivRight's parent should be a CivMain
*/

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

export function CivRight({
    extraClasses,
    children,
}: {
    extraClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "right-margin ";
    if (extraClasses) {
        classes += extraClasses;
    }

    return <div class={classes}>{children}</div>;
}

export function CivForm({
    onSubmit,
    children,
}: {
    onSubmit: (e: Event) => void;
    children: ComponentChildren;
}) {
    return (
        <form class="muh-form" onSubmit={onSubmit}>
            {children}
        </form>
    );
}

export function CivLeftLabel({
    forId,
    extraClasses,
    children,
}: {
    forId?: string;
    extraClasses?: string;
    children: ComponentChildren;
}) {
    return (
        <CivLeft>
            <label for={forId} class={extraClasses}>
                {children}
            </label>
        </CivLeft>
    );
}
