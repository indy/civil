import { h } from "preact";

import Net from '../Net';
import { daysUntil, plural } from '../JsUtils';
import { useLocalReducer } from '../PreactUtils';

import CivilTextArea from './CivilTextArea';
import DeleteConfirmation from './DeleteConfirmation';

const FLASHCARD_IS_EDITING_TOGGLE = 'flashcard-is-editing-toggle';
const FLASHCARD_SET_PROMPT = 'flashcard-set-prompt';
const FLASHCARD_EDITING_SAVED = 'flashcard-editing-saved';
const FLASHCARD_EDITING_CANCELLED = 'flashcard-editing-cancelled';
const FLASHCARD_DELETED = 'flashcard-deleted';

function reducer(state?: any, action?: any) {
    switch(action.type) {
    case FLASHCARD_IS_EDITING_TOGGLE: {
        const newState = { ...state };
        newState.isEditingFlashCard = !newState.isEditingFlashCard;
        return newState;
    }
    case FLASHCARD_SET_PROMPT: {
        const newState = { ...state };
        newState.flashcard.prompt = action.data.prompt;
        return newState;
    }
    case FLASHCARD_DELETED: {
        const newState = { ...state };
        newState.isEditingFlashCard = false;
        return newState;
    }
    case FLASHCARD_EDITING_SAVED: {
        const newState = { ...state };
        newState.originalFlashcard.prompt = newState.flashcard.prompt;
        newState.isEditingFlashCard = false;

        return newState;
    }
    case FLASHCARD_EDITING_CANCELLED: {
        const newState = { ...state };
        newState.flashcard.prompt = newState.originalFlashcard.prompt;
        newState.isEditingFlashCard = false;

        console.log(newState);


        return newState;
    }
    default: throw new Error(`unknown action: ${action}`);
    }
}

export default function FlashCard({flashcard, onDelete}: {flashcard?: any, onDelete?: any}) {

    let dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

    const initialState = {
        nextTestDateString: (new Date(flashcard.nextTestDate)).toLocaleDateString("en-US", dateOptions),
        daysUntilNextTest: plural(daysUntil(flashcard.nextTestDate), "day", "s"),
        isEditingFlashCard: false,
        showDeleteConfirmation: false,
        originalFlashcard: { ...flashcard },
        flashcard: { ...flashcard }
    };

    const [local, localDispatch] = useLocalReducer(reducer, initialState);

    function handleChangeEvent(e: Event) {
        if (e.target instanceof HTMLInputElement) {
            const target = e.target;
            localDispatch(FLASHCARD_SET_PROMPT, { prompt: target.value });
        }
    };

    function editToggleClicked(e: Event) {
        e.preventDefault();
        localDispatch(FLASHCARD_IS_EDITING_TOGGLE);
    }

    function confirmedDeleteClicked() {
        const url = `/api/sr/${local.flashcard.id}`;
        Net.delete<any, any>(url, {}).then(() => {
            localDispatch(FLASHCARD_DELETED);
            onDelete(flashcard);
        });
    }

    function saveClicked(e) {
        e.preventDefault();

        const url = `/api/sr/${local.flashcard.id}`;
        Net.put(url, local.flashcard).then(updatedFlashcard => {
            localDispatch(FLASHCARD_EDITING_SAVED);
        });
    }

    function cancelClicked(e) {
        e.preventDefault();
        localDispatch(FLASHCARD_EDITING_CANCELLED);
    }

    if (!local.isEditingFlashCard) {
        // Normal View
        //
        return (
        <div class="note">
            <div>
                <p>
                    <span class="right-margin">Next test in {local.daysUntilNextTest} ({ local.nextTestDateString })</span>
                    <div class="in-note-flash-card-prompt">
                        { local.flashcard.prompt }
                    </div>
                </p>
                <div>
                    <button onClick={ editToggleClicked }>Edit FlashCard</button>
                    <DeleteConfirmation onDelete={confirmedDeleteClicked }/>
                </div>
            </div>
        </div>);
    } else {
        // Editing
        //
        return (
        <div class="note">
            <div>
                <p>
                    <span class="right-margin">Next test in {local.daysUntilNextTest} ({ local.nextTestDateString })</span>
                    <div class="civil-form">
                        <CivilTextArea id="flashcard-prompt"
                                       value={ local.flashcard.prompt }
                                       onInput={ handleChangeEvent }/>
                    </div>
                </p>
                <div>
                    <button onClick={ saveClicked }>Save Edits</button>
                    <button onClick={ cancelClicked } >Cancel Editing</button>
                </div>
            </div>
        </div>);
    }
}
