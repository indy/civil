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
        process(content);
    }

    function onReturnPressed(inputContent: string) {
        // note: use inputContent rather than this component's 'content' state as
        // this onReturnPressed function is captured by the CivilInput at
        // creation time and therefore this component's 'content' value will always
        // be the empty string.
        //
        process(inputContent);
    }

    function process(deckName: string) {
        if (deckName.length > 0) {
            setShowInput(false);
            createDeck(deckKind, deckName);
        }
    }

    const buttonLabel = `Add a new ${deckKindToSingularString(deckKind)}...`;

    if (showInput) {
        return (
            <span>
                <CivilInput
                    value={content}
                    onReturnPressed={onReturnPressed}
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
