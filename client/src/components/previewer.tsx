import type { Key, PreviewDeck } from "../types";

import { getAppState } from "../app-state";

import { visibleClass } from "../shared/css";

import buildMarkup from "./build-markup";

export default function Previewer() {
    const appState = getAppState();

    let id: Key = appState.visiblePreviewDeck.value.id;
    let content: any = [];

    let previewDeck: PreviewDeck | undefined =
        appState.previewCache.value.get(id);
    if (previewDeck) {
        let hasContent = previewDeck.notes.some((n) => n.content.length > 0);

        if (hasContent) {
            content = previewDeck.notes.map((n) =>
                buildMarkup(n.content, n.font, n.id, { ignoreRight: true }),
            );
        }
    }

    let showing: boolean = appState.visiblePreviewDeck.value.showing;

    let classes = "c-previewer";
    classes += visibleClass("previewer", showing && content.length > 0);

    return <div class={classes}>{content}</div>;
}
