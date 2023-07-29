import { h } from "preact";
import { route } from "preact-router";

import { DeckKind, Key } from "types";

import DeleteConfirmation from "components/delete-confirmation";
import Net from "shared/net";
import { AppStateChange } from "app-state";
import { buildUrl } from "shared/civil";
import { deckKindToResourceString } from "shared/deck";

type Props = {
    deckKind: DeckKind;
    id: Key;
};

export default function DeleteDeckConfirmation({ deckKind, id }: Props) {
    function confirmedDeleteClicked() {
        let str = deckKindToResourceString(deckKind);
        Net.delete(`${buildUrl(deckKind, id, "/api")}`, {}).then(() => {
            // remove the resource from the app state
            AppStateChange.deleteDeck({ id });
            route(`/${str}`, true);
        });
    }

    return <DeleteConfirmation onDelete={confirmedDeleteClicked} />;
}
