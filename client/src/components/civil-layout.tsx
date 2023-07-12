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
    replacementClasses,
    children,
}: {
    replacementClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "muh-main ";
    if (replacementClasses) {
        classes += replacementClasses;
    } else {
        classes += "muh-main-standard";
    }

    return <div class={classes}>{children}</div>;
}

export function CivLeft({
    extraClasses,
    ui,
    children,
}: {
    extraClasses?: string;
    ui?: boolean;
    children: ComponentChildren;
}) {
    let classes = "left-margin ";

    if (ui) {
        classes += "left-margin-ui ";
    }

    if (extraClasses) {
        classes += extraClasses;
    }

    return (
        <div class={classes}>
            <div class="left-margin-inner">{children}</div>
        </div>
    );
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
