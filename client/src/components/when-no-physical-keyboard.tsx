import { type ComponentChildren } from "preact";

import { getAppState } from "../app-state";

export default function WhenNoPhysicalKeyboard({
    children,
}: {
    children: ComponentChildren;
}) {
    const appState = getAppState();
    return (
        <div class="when-no-physical-keyboard">
            {!appState.hasPhysicalKeyboard && children}
        </div>
    );
}
