import { html, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';

import DeleteConfirmation from '/js/components/DeleteConfirmation.js';

export default function DeleteDeckConfirmation({ resource, id }) {
    const [state, appDispatch] = useStateValue();

    function confirmedDeleteClicked() {
        Net.delete(`/api/${resource}/${id}`).then(() => {
            // remove the resource from the app state
            appDispatch({
                type: 'deleteDeck',
                id: id
            });
            route(`/${resource}`, true);
        });
    }

    if (!state.sigs.deckManagerState.value.showDelete) {
        return html`<div></div>`;
    }

    return html`<${DeleteConfirmation} onDelete=${confirmedDeleteClicked }/>`;
}
