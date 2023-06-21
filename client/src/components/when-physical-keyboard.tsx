import { h, ComponentChildren } from "preact";

import { getAppState } from "app-state";

export default function WhenPhysicalKeyboard({
    children,
}: {
    children: ComponentChildren;
}) {
    const appState = getAppState();
    return <div>{appState.hasPhysicalKeyboard && children}</div>;
}
