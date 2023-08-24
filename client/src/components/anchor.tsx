import { ComponentChildren, h } from "preact";

import { CivilMode } from "types";

import { getAppState } from "app-state";

type AnchorProps = {
    key?: number;
    href?: string;
    children?: ComponentChildren;
};

export default function Anchor({ key, href, children }: AnchorProps) {
    const appState = getAppState();

    let classes = "note-inline-link ";
    if (appState.mode.value !== CivilMode.View) {
        classes += "note-inline-link-disabled";
    }

    return (
        <a href={href} key={key} class={classes}>
            {children}
        </a>
    );
}
