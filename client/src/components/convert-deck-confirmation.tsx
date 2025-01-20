import { route } from "preact-router";

import { DeckKind } from "../enums";
import type { Key } from "../types";

// import { AppStateChange } from "../app-state";

import { buildConvertUrl } from "../shared/civil";
import { deckKindToResourceString } from "../shared/deck";
import Net from "../shared/net";

import ConvertConfirmation from "./convert-confirmation";

type Props = {
    deckKind: DeckKind;
    id: Key;
    convertText: string;
};

export default function ConvertDeckConfirmation({ deckKind, id, convertText }: Props) {
    function confirmedConvertClicked() {
        Net.put(`${buildConvertUrl(deckKind, id, "/api")}`, {}).then(() => {
            // todo: this code was copied from delete-deck-confirmation
            // todo: so do we require an AppStateChange.convertDeck function?

            let targetDeckKind: DeckKind;
            if (deckKind == DeckKind.Idea) {
                targetDeckKind = DeckKind.Concept;
            } else if (deckKind == DeckKind.Concept) {
                targetDeckKind = DeckKind.Idea;
            } else {
                console.error("convert only works between Ideas and Concepts");
                return;
            }
            let str = deckKindToResourceString(targetDeckKind);
            route(`/${str}/${id}`, true);
        });
    }

    return <ConvertConfirmation onConvert={confirmedConvertClicked} convertText={convertText} />;
}
