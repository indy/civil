import { h } from "preact";

import { FlashCard } from "types";

import { svgFlashCard } from "components/svg-icons";

export default function FlashCardIndicator({
    flashcard,
    index,
    onClick,
}: {
    flashcard: FlashCard;
    index: number;
    onClick: (f: FlashCard, index) => void;
}) {
    function onClicked() {
        onClick(flashcard, index);
    }

    return (
        <div class="left-margin-entry" key={flashcard.id}>
            <span class="inlined-blocked" onClick={onClicked}>
                {svgFlashCard()}
            </span>
        </div>
    );
}
