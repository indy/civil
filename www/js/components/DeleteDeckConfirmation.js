import { html, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { AppStateChange } from '/js/AppState.js';

import DeleteConfirmation from '/js/components/DeleteConfirmation.js';

export default function DeleteDeckConfirmation({ resource, id }) {
    const state = useStateValue();

    function confirmedDeleteClicked() {
        Net.delete(`/api/${resource}/${id}`).then(() => {
            // remove the resource from the app state
            AppStateChange.deleteDeck(id);
            route(`/${resource}`, true);
        });
    }

    if (!state.deckManagerState.value.showDelete) {
        return html`<div></div>`;
    }

    return html`<${DeleteConfirmation} onDelete=${confirmedDeleteClicked }/>`;
}
