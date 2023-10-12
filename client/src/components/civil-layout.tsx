import { type ComponentChildren } from "preact";

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
    let classes = "c-civ-container ";
    if (extraClasses) {
        classes += extraClasses;
    }

    return <div class={classes}>{children}</div>;
}

export function CivMain({
    replacementClasses,
    extraClasses,
    children,
}: {
    replacementClasses?: string;
    extraClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "c-civ-main ";
    if (extraClasses) {
        classes += extraClasses + " ";
    }
    if (replacementClasses) {
        classes += replacementClasses;
    } else {
        classes += "civ-main-standard";
    }

    return <div class={classes}>{children}</div>;
}

export function CivMainUi({
    replacementClasses,
    extraClasses,
    children,
}: {
    replacementClasses?: string;
    extraClasses?: string;
    children: ComponentChildren;
}) {
    let classes = "c-civ-main-ui ";
    if (extraClasses) {
        classes += extraClasses + " ";
    }
    if (replacementClasses) {
        classes += replacementClasses;
    } else {
        classes += "civ-main-standard";
    }

    return <div class={classes}>{children}</div>;
}

export function CivLeft({
    extraClasses,
    children,
    ui,
}: {
    extraClasses?: string;
    children: ComponentChildren;
    ui?: boolean;
}) {
    let classes = "c-civ-left ";
    if (ui) {
        classes += " civ-left-ui ";
    }

    if (extraClasses) {
        classes += extraClasses;
    }

    return (
        <div class={classes}>
            <div class="civ-left-inner">{children}</div>
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
        <form class="c-civ-form" onSubmit={onSubmit}>
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
        <CivLeft extraClasses="c-civ-left-label">
            <label for={forId} class={extraClasses}>
                {children}
            </label>
        </CivLeft>
    );
}
