import { type ComponentChildren } from "preact";

import { CivilMode } from "../enums";

import { getAppState } from "../app-state";

export default function WhenEditMode({
    children,
}: {
    children: ComponentChildren;
}) {
    const appState = getAppState();
    return <div>{appState.mode.value === CivilMode.Edit && children}</div>;
}
