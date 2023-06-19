import { h } from "preact";
import { useState } from "preact/hooks";

import { DeckKind } from "types";

import { deckKindToSingularString, createDeck } from "utils/civil";

import CivilButton from "components/civil-button";
import CivilInput from "components/civil-input";

export default function CivilButtonCreateDeck({
    deckKind,
}: {
    deckKind: DeckKind;
}) {
    const [content, setContent] = useState("");
    const [showInput, setShowInput] = useState(false);

    function toggleInput() {
        setShowInput(!showInput);
    }

    function clickedCancel() {
        setShowInput(false);
    }

    function clickedOk() {
        if (content.length > 0) {
            setShowInput(false);
            createDeck(deckKind, content);
        }
    }

    const buttonLabel = `Add a new ${deckKindToSingularString(deckKind)}...`;

    if (showInput) {
        return (
            <span>
                <CivilInput
                    value={content}
                    onContentChange={setContent}
                    focus
                />
                <CivilButton onClick={clickedCancel}>Cancel</CivilButton>
                <CivilButton onClick={clickedOk}>Create</CivilButton>
            </span>
        );
    } else {
        return <CivilButton onClick={toggleInput}>{buttonLabel}</CivilButton>;
    }
}
