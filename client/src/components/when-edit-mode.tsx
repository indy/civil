import { ComponentChildren, h } from "preact";

import { CivilMode } from "types";

import { getAppState } from "app-state";

export default function WhenEditMode({
    children,
}: {
    children: ComponentChildren;
}) {
    const appState = getAppState();
    return <div>{appState.mode.value === CivilMode.Edit && children}</div>;
}
