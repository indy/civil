import { h, ComponentChildren } from "preact";

import { getAppState } from "app-state";

export default function WhenVerbose({
    children,
}: {
    children: ComponentChildren;
}) {
    const appState = getAppState();
    return <div>{appState.verboseUI.value && children}</div>;
}
