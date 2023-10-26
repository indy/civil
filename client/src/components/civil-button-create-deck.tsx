import { route } from "preact-router";
import { useState } from "preact/hooks";

import { DeckKind } from "../enums";

import { createDeck, deckKindToSingularString } from "../shared/deck";

import CivilButton from "./civil-button";
import CivilInput from "./civil-input";

export default function CivilButtonCreateDeck({
    deckKind,
}: {
    deckKind: DeckKind;
}) {
    const [content, setContent] = useState("");
    const [showInput, setShowInput] = useState(false);

    function clickedButton() {
        if (deckKind === DeckKind.Dialogue) {
            route("/dialogues/chat", false);
        } else if (deckKind === DeckKind.Quote) {
            route("/quotes/new", false);
        } else {
            setShowInput(!showInput);
        }
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
        return <CivilButton onClick={clickedButton}>{buttonLabel}</CivilButton>;
    }
}
