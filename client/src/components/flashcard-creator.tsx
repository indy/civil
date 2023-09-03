import { h } from "preact";
import { useState } from "preact/hooks";

import {
    CivilMode,
    FlashCard,
    Key,
    Note,
} from "types";

import { AppStateChange, getAppState } from "app-state";
import Net from "shared/net";

import CivilButton from "components/civil-button";
import CivilTextArea from "components/civil-text-area";

type FlashCardCreatorProps = {
    note: Note,
    onHide: () => void,
};

export default function FlashCardCreator({ note, onHide }: FlashCardCreatorProps) {
    const appState = getAppState();

    let [flashCardPrompt, setFlashCardPrompt] = useState("");

    function onSave() {
        type Data = {
            noteId: Key;
            prompt: string;
        };
        let data: Data = {
            noteId: note.id,
            prompt: flashCardPrompt,
        };

        Net.post<Data, FlashCard>("/api/memorise", data).then((flashcard) => {
            note.flashcards.push(flashcard);

            let reviewCount = appState.memoriseReviewCount.value + 1;

            AppStateChange.mode({ mode: CivilMode.View });
            AppStateChange.setReviewCount({ count: reviewCount });

            setFlashCardPrompt("");
            onHide();
        });
    }

    function onContentChange(content: string) {
        setFlashCardPrompt(content);
    }

    return (
        <div class="block-width form-margin">
            <label>Flash Card Prompt</label>
            <div>
                <CivilTextArea
                    value={flashCardPrompt}
                    onContentChange={onContentChange}
                />
            </div>
            <CivilButton onClick={onHide}>Cancel</CivilButton>
            <CivilButton onClick={onSave}>
                Save Flash Card Prompt
            </CivilButton>
        </div>
    );
}
