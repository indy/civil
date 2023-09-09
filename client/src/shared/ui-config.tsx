import { DeckKind, UiConfig, ColourScheme } from "../types";

import Net from "../shared/net";
import { AppStateChange } from "../app-state";

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
            [DeckKind.Article]: 15,
            [DeckKind.Person]: 15,
            [DeckKind.Idea]: 15,
            [DeckKind.Timeline]: 15,
            [DeckKind.Quote]: 15,
            [DeckKind.Dialogue]: 15,
            [DeckKind.Event]: 15,
        },
    };
}
