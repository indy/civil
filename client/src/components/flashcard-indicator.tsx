import type { FlashCard } from "../types";

import { svgFlashCard } from "./svg-icons";

export default function FlashCardIndicator({
    flashcard,
    onClick,
}: {
    flashcard: FlashCard;
    onClick: (f: FlashCard) => void;
}) {
    function onClicked() {
        onClick(flashcard);
    }

    return (
        <div class="left-margin-entry" key={flashcard.id}>
            <span class="inlined-blocked" onClick={onClicked}>
                {svgFlashCard()}
            </span>
        </div>
    );
}
