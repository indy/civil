import { FlashCard } from "../types";

import { plural } from "../shared/english";
import Net from "../shared/net";
import { daysUntil } from "../shared/time";

import CivilButton from "./civil-button";
import CivilTextArea from "./civil-text-area";
import DeleteConfirmation from "./delete-confirmation";
import useLocalReducer from "./use-local-reducer";
import { CivMain } from "./civil-layout";

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

function reducer(state: State, action: Action): State {
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

type ViewFlashCardProps = {
    flashcard: FlashCard;
    onDelete: (_: FlashCard) => void;
};

export default function ViewFlashCard({
    flashcard,
    onDelete,
}: ViewFlashCardProps) {
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

    const [local, localDispatch] = useLocalReducer<State, ActionType>(
        reducer,
        initialState
    );

    function handleContentChange(text: string) {
        localDispatch(ActionType.SetPrompt, text);
    }

    function editToggleClicked(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.IsEditingToggle);
    }

    function confirmedDeleteClicked() {
        const url = `/api/memorise/${local.flashcard.id}`;
        type Data = {};
        Net.delete<Data, boolean>(url, {}).then(() => {
            localDispatch(ActionType.Deleted);
            onDelete(flashcard);
        });
    }

    function saveClicked() {
        const url = `/api/memorise/${local.flashcard.id}`;
        Net.put<FlashCard, FlashCard>(url, local.flashcard).then(
            (_updatedFlashcard) => {
                localDispatch(ActionType.EditingSaved);
            }
        );
    }

    function cancelClicked() {
        localDispatch(ActionType.EditingCancelled);
    }

    if (!local.isEditingFlashCard) {
        // Normal View
        //
        return (
            <CivMain>
                <p>
                    <span class="right-margin">
                        Next test in {local.daysUntilNextTest} (
                        {local.nextTestDateString})
                    </span>
                    <div class="in-note-flash-card-prompt">
                        {flashcard.prompt}
                    </div>
                </p>
                <div>
                    <button onClick={editToggleClicked}>Edit FlashCard</button>
                    <DeleteConfirmation onDelete={confirmedDeleteClicked} />
                </div>
            </CivMain>
        );
    } else {
        // Editing
        //
        return (
            <CivMain>
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
                    <CivilButton onClick={saveClicked}>Save Edits</CivilButton>
                    <CivilButton onClick={cancelClicked}>Cancel Editing</CivilButton>
                </div>
            </CivMain>
        );
    }
}
