import { h } from "preact";
import { route } from "preact-router";

import { DeckKind } from "../types";

import DeleteConfirmation from "./DeleteConfirmation";
import Net from "../Net";
import { AppStateChange } from "../AppState";
import { buildUrl, deckKindToResourceString } from "../CivilUtils";

type Props = {
    deckKind: DeckKind;
    id: number;
};

export default function DeleteDeckConfirmation({ deckKind, id }: Props) {
    function confirmedDeleteClicked() {
        let str = deckKindToResourceString(deckKind);
        Net.delete(`/api/${buildUrl(deckKind, id)}`, {}).then(() => {
            // remove the resource from the app state
            AppStateChange.deleteDeck(id);
            route(`/${str}`, true);
        });
    }

    return <DeleteConfirmation onDelete={confirmedDeleteClicked} />;
}
