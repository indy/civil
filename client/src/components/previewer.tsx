import { h } from "preact";

import { Key, Note, PreviewDeck } from "types";

import { getAppState } from "app-state";

import buildMarkup from "features/notes/build-markup";

export default function Previewer() {
    const appState = getAppState();

    function buildPreviewMarkup(n: Note) {
        return <p>{buildMarkup(n.content, { ignoreRight: true })}</p>;
    }

    let classes = "previewer";
    let id: Key = appState.visiblePreviewDeck.value.id;
    let content: any = [];

    if (appState.previewCache.value[id]) {
        let previewDeck: PreviewDeck = appState.previewCache.value[id];
        let hasContent = previewDeck.notes.some((n) => n.content.length > 0);

        if (hasContent) {
            content = previewDeck.notes.map(buildPreviewMarkup);
        }
    }

    let showing: boolean = appState.visiblePreviewDeck.value.showing;

    if (showing && content.length > 0) {
        classes += " previewer-active";
    }

    return <div class={classes}>{content}</div>;
}
