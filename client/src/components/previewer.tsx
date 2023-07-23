import { h } from "preact";

import { Key, PreviewDeck } from "types";

import { getAppState } from "app-state";

import buildMarkup from "components/notes/build-markup";

export default function Previewer() {
    const appState = getAppState();

    let classes = "previewer";
    let id: Key = appState.visiblePreviewDeck.value.id;
    let content: any = [];

    if (appState.previewCache.value[id]) {
        let previewDeck: PreviewDeck = appState.previewCache.value[id];
        let hasContent = previewDeck.notes.some((n) => n.content.length > 0);

        if (hasContent) {
            content = previewDeck.notes.map((n) =>
                buildMarkup(n.content, n.typeface, n.id, { ignoreRight: true })
            );
        }
    }

    let showing: boolean = appState.visiblePreviewDeck.value.showing;

    if (showing && content.length > 0) {
        classes += " previewer-active";
    }

    return <div class={classes}>{content}</div>;
}
