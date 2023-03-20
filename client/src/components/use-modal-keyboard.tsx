import { useEffect } from "preact/hooks";

import { State } from "types";
import { getAppState } from "app-state";

export default function useModalKeyboard(
    id: number,
    keyHandler: (key: string) => void
) {
    const appState = getAppState();
    const isActive = canReceiveModalCommands(appState);
    function onKeyDown(e: KeyboardEvent) {
        if (isActive) {
            keyHandler(e.key);
        }
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [id]);

    return isActive;
}

function canReceiveModalCommands(appState: State) {
    return (
        !appState.componentRequiresFullKeyboardAccess.value &&
        !appState.showingSearchCommand.value
    );
}
