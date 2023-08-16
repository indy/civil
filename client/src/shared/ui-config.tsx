import { DeckKind, UiConfig, ColourScheme } from "types";

import Net from "shared/net";
import { AppStateChange } from "app-state";

export function updateAndSaveUiConfig(uiConfig: UiConfig) {
    type EditUiConfig = {
        json: string;
    };

    // save the uiconfig as an opaque json string
    //
    const json = JSON.stringify(uiConfig);
    Net.put<EditUiConfig, any>("api/users/ui_config", { json });

    AppStateChange.setUiConfig({ uiConfig });
}


export function basicUiConfig(): UiConfig {
    return {
        colourScheme: ColourScheme.Light,
        decksPerPage: {
            [DeckKind.Article]: 20,
            [DeckKind.Person]: 20,
            [DeckKind.Idea]: 20,
            [DeckKind.Timeline]: 20,
            [DeckKind.Quote]: 20,
            [DeckKind.Dialogue]: 20,
            [DeckKind.Event]: 20,
        }
    }
}
