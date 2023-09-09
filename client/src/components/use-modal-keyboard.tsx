import { useEffect } from "preact/hooks";

import { State } from "../types";

import { getAppState } from "../app-state";

export default function useModalKeyboard(
    id: number,
    keyHandler: (key: string) => void
) {
    const appState = getAppState();

    function onKeyDown(e: KeyboardEvent) {
        if (canReceiveModalCommands(appState)) {
            keyHandler(e.key);
        }
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [id]);

    return canReceiveModalCommands(appState);
}

function canReceiveModalCommands(appState: State) {
    return (
        appState.hasPhysicalKeyboard &&
        !appState.componentRequiresFullKeyboardAccess.value &&
        !appState.showingCommandBar.value
    );
}
