import { ComponentChildren, h } from "preact";

import { getAppState } from "app-state";

export default function WhenPhysicalKeyboard({
    children,
}: {
    children: ComponentChildren;
}) {
    const appState = getAppState();
    return (
        <div class="when-physical-keyboard">
            {appState.hasPhysicalKeyboard && children}
        </div>
    );
}
