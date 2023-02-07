import { h } from "preact";
import { route } from "preact-router";

import { DeckKind } from "../types";

import DeleteConfirmation from "./DeleteConfirmation";
import Net from "../Net";
import { AppStateChange } from "../AppState";
import { deckKindToResourceString } from "../CivilUtils";

type Props = {
    resource: DeckKind;
    id: number;
};

export default function DeleteDeckConfirmation({ resource, id }: Props) {
    function confirmedDeleteClicked() {
        let str = deckKindToResourceString(resource);
        Net.delete(`/api/${str}/${id}`, {}).then(() => {
            // remove the resource from the app state
            AppStateChange.deleteDeck(id);
            route(`/${str}`, true);
        });
    }

    return <DeleteConfirmation onDelete={confirmedDeleteClicked} />;
}
