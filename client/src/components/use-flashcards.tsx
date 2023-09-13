import { useState } from "preact/hooks";

import { FlashCard } from "../types";

import FlashCardIndicator from "./flashcard-indicator";
import ViewFlashCard from "./view-flashcard";

enum FlashCardUIState {
    Minimised = 1,
    Maximised,
    Deleted,
}

export default function useFlashcards(flashcards: Array<FlashCard>) {
    const [showFlashCard, setShowFlashCard] = useState(
        flashcards.map(() => FlashCardUIState.Minimised)
    );

    function onClickedFlashcard(flashcard: FlashCard) {
        const index = flashcards.findIndex((f) => f.id === flashcard.id);
        if (index !== -1) {
            let newshowFlashCard = [...showFlashCard];
            if (newshowFlashCard[index] === FlashCardUIState.Minimised) {
                newshowFlashCard[index] = FlashCardUIState.Maximised;
            } else if (newshowFlashCard[index] === FlashCardUIState.Maximised) {
                newshowFlashCard[index] = FlashCardUIState.Minimised;
            }
            setShowFlashCard(newshowFlashCard);
        }
    }

    function flashCardDeleted(flashcard: FlashCard) {
        const index = flashcards.findIndex((f) => f.id === flashcard.id);
        if (index !== -1) {
            let newshowFlashCard = [...showFlashCard];
            newshowFlashCard[index] = FlashCardUIState.Deleted;
            setShowFlashCard(newshowFlashCard);
        }
    }

    const indicators = flashcards
        .filter((_f, i) => showFlashCard[i] !== FlashCardUIState.Deleted)
        .map((flashcard) => (
            <FlashCardIndicator
                flashcard={flashcard}
                onClick={onClickedFlashcard}
            />
        ));

    const visible = flashcards
        .filter((_f, i) => showFlashCard[i] === FlashCardUIState.Maximised)
        .map((flashcard) => (
            <ViewFlashCard flashcard={flashcard} onDelete={flashCardDeleted} />
        ));

    return [indicators, visible];
}
