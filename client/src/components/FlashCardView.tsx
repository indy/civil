import { h } from "preact";

import { FlashCard } from "../types";

import Net from "../Net";
import { daysUntil, plural } from "../JsUtils";
import { useLocalReducer } from "../PreactUtils";

import CivilTextArea from "./CivilTextArea";
import DeleteConfirmation from "./DeleteConfirmation";

enum ActionType {
    IsEditingToggle,
    SetPrompt,
    EditingSaved,
    EditingCancelled,
    Deleted,
}

type Action = {
    type: ActionType;
    data?: string;
};

type State = {
    nextTestDateString: string;
    daysUntilNextTest: string;
    isEditingFlashCard: boolean;
    showDeleteConfirmation: boolean;
    originalFlashcard: FlashCard;
    flashcard: FlashCard;
};

function reducer(state: State, action: Action) {
    switch (action.type) {
        case ActionType.IsEditingToggle: {
            const newState = { ...state };
            newState.isEditingFlashCard = !newState.isEditingFlashCard;
            return newState;
        }
        case ActionType.SetPrompt: {
            const newState = { ...state };
            if (action.data) {
                const prompt: string = action.data;
                newState.flashcard.prompt = prompt;
            }
            return newState;
        }
        case ActionType.Deleted: {
            const newState = { ...state };
            newState.isEditingFlashCard = false;
            return newState;
        }
        case ActionType.EditingSaved: {
            const newState = { ...state };
            newState.originalFlashcard.prompt = newState.flashcard.prompt;
            newState.isEditingFlashCard = false;

            return newState;
        }
        case ActionType.EditingCancelled: {
            const newState = { ...state };
            newState.flashcard.prompt = newState.originalFlashcard.prompt;
            newState.isEditingFlashCard = false;

            console.log(newState);

            return newState;
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

type Props = {
    flashcard: FlashCard;
    onDelete: (_: FlashCard) => void;
};

export default function FlashCardView({ flashcard, onDelete }: Props) {
    let dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    const initialState: State = {
        nextTestDateString: new Date(flashcard.nextTestDate).toLocaleDateString(
            "en-US",
            dateOptions
        ),
        daysUntilNextTest: plural(
            daysUntil(flashcard.nextTestDate),
            "day",
            "s"
        ),
        isEditingFlashCard: false,
        showDeleteConfirmation: false,
        originalFlashcard: { ...flashcard },
        flashcard: { ...flashcard },
    };

    const [local, localDispatch] = useLocalReducer(reducer, initialState);

    function handleContentChange(text: string) {
        localDispatch(ActionType.SetPrompt, text);
    }

    function editToggleClicked(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.IsEditingToggle);
    }

    function confirmedDeleteClicked() {
        const url = `/api/sr/${local.flashcard.id}`;
        type Data = {};
        Net.delete<Data, boolean>(url, {}).then(() => {
            localDispatch(ActionType.Deleted);
            onDelete(flashcard);
        });
    }

    function saveClicked(e) {
        e.preventDefault();

        const url = `/api/sr/${local.flashcard.id}`;
        Net.put<FlashCard, FlashCard>(url, local.flashcard).then(
            (updatedFlashcard) => {
                localDispatch(ActionType.EditingSaved);
            }
        );
    }

    function cancelClicked(e) {
        e.preventDefault();
        localDispatch(ActionType.EditingCancelled);
    }

    if (!local.isEditingFlashCard) {
        // Normal View
        //
        return (
            <div class="note">
                <div>
                    <p>
                        <span class="right-margin">
                            Next test in {local.daysUntilNextTest} (
                            {local.nextTestDateString})
                        </span>
                        <div class="in-note-flash-card-prompt">
                            {local.flashcard.prompt}
                        </div>
                    </p>
                    <div>
                        <button onClick={editToggleClicked}>
                            Edit FlashCard
                        </button>
                        <DeleteConfirmation onDelete={confirmedDeleteClicked} />
                    </div>
                </div>
            </div>
        );
    } else {
        // Editing
        //
        return (
            <div class="note">
                <div>
                    <p>
                        <span class="right-margin">
                            Next test in {local.daysUntilNextTest} (
                            {local.nextTestDateString})
                        </span>
                        <div class="civil-form">
                            <CivilTextArea
                                id="flashcard-prompt"
                                value={local.flashcard.prompt}
                                onContentChange={handleContentChange}
                            />
                        </div>
                    </p>
                    <div>
                        <button onClick={saveClicked}>Save Edits</button>
                        <button onClick={cancelClicked}>Cancel Editing</button>
                    </div>
                </div>
            </div>
        );
    }
}
