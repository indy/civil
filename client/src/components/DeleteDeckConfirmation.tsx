import { h } from "preact";
import { route } from "preact-router";

import Net from '../Net';
import { AppStateChange } from '../AppState';

import DeleteConfirmation from './DeleteConfirmation';

export default function DeleteDeckConfirmation({ resource, id }: { resource?: any, id?: any }) {
    function confirmedDeleteClicked() {
        Net.delete(`/api/${resource}/${id}`, {}).then(() => {
            // remove the resource from the app state
            AppStateChange.deleteDeck(id);
            route(`/${resource}`, true);
        });
    }

    return (<DeleteConfirmation onDelete={confirmedDeleteClicked }/>);
}
