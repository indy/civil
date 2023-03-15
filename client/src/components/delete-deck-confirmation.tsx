import { h } from "preact";
import { route } from "preact-router";

import { DeckKind, Key } from "types";

import DeleteConfirmation from "./delete-confirmation";
import Net from "net";
import { AppStateChange } from "app-state";
import { buildUrl, deckKindToResourceString } from "../civil-utils";

type Props = {
    deckKind: DeckKind;
    id: Key;
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
