import { useEffect, useRef, useState } from "preact/hooks";

import { Font, NoteKind } from "../enums";
import type { Key, Notes } from "../types";

import { getAppState } from "../app-state";

import Net from "../shared/net";

import { CivMain } from "./civil-layout";
import CivilButton from "./civil-button";
import CivilTextArea from "./civil-text-area";
import ImageSelector from "./image-selector";

type Props = {
    label: string;
    onCreate: (ns: Notes) => void;
    onCancel: () => void;
    deckId: Key;
    font: Font;
    prevNoteId?: number;
    nextNoteId?: number;
    noteKind: NoteKind;
    optionalPointId?: number;
};

export default function NoteForm({
    label,
    onCreate,
    onCancel,
    deckId,
    font,
    prevNoteId,
    nextNoteId,
    noteKind,
    optionalPointId,
}: Props) {
    const appState = getAppState();
    const textAreaRef = useRef(null);

    // need to keep track of the cursor position in case the user:
    // moves cursor to a position within the text and clicks on the ImageSelector
    // to add markup multiple times. The expected result is to have multiple
    // image markups at the point where the cursor was (by default the cursor
    // goes to the end of the content once the first image markup has been added)
    //
    type Local = {
        content: string;
        oldCursorPos: number;
        splitIntoMultipleNotes: boolean;
        textAreaFocused: boolean;
    };

    const [local, setLocal] = useState<Local>({
        content: "",
        oldCursorPos: 0,
        splitIntoMultipleNotes: true,
        textAreaFocused: false,
    });

    const handleContentChange = (content: string) => {
        setLocal({
            ...local,
            content,
        });
    };

    useEffect(() => {
        if (textAreaRef.current) {
            const tar = textAreaRef.current as HTMLElement;
            tar.focus();
        }
    }, []);

    function onImagePaste(markup: string) {
        let content = local.content;

        let cursor = local.oldCursorPos;
        if (local.textAreaFocused) {
            if (textAreaRef.current) {
                const tar = textAreaRef.current as HTMLTextAreaElement;
                cursor = tar.selectionStart;
            }

            // cursor = textAreaRef.current.selectionStart;
        }

        let newContent =
            content.slice(0, cursor) + markup + " " + content.slice(cursor);

        setLocal({
            ...local,
            oldCursorPos: cursor + markup.length + 1,
            content: newContent,
        });
    }

    function onTextAreaFocus() {
        setLocal({
            ...local,
            textAreaFocused: true,
        });
    }

    function onTextAreaBlur() {
        if (textAreaRef.current) {
            const tar = textAreaRef.current as HTMLTextAreaElement;
            let cursor = tar.selectionStart;

            setLocal({
                ...local,
                oldCursorPos: cursor,
                textAreaFocused: false,
            });
        }
    }

    function onSubmit(e: Event) {
        e.preventDefault();

        if (appState.wasmInterface) {
            const markup = local.content;
            const notes = local.splitIntoMultipleNotes
                ? appState.wasmInterface.splitter(markup)
                : [markup];

            addNote(
                notes,
                font,
                deckId,
                noteKind,
                prevNoteId,
                nextNoteId,
                optionalPointId,
            )
                .then((allNotes) => {
                    onCreate(allNotes);
                })
                .catch((error) => console.error(error.message));
        }
    }

    function handleCheckbox() {
        setLocal({
            ...local,
            splitIntoMultipleNotes: !local.splitIntoMultipleNotes,
        });
    }

    return (
        <div>
            <CivMain>
                <form class="civil-add-note-form" onSubmit={onSubmit}>
                    <label for="content">{label}</label>
                    <br />
                    <CivilTextArea
                        id="content"
                        elementRef={textAreaRef}
                        elementClass="new-note-textarea"
                        value={local.content}
                        onFocus={onTextAreaFocus}
                        onBlur={onTextAreaBlur}
                        onContentChange={handleContentChange}
                        onPaste={onImagePaste}
                    />
                    <br />

                    <CivilButton onClick={onCancel}>Cancel</CivilButton>

                    <input class="c-civil-button" type="submit" value="Save" />
                    <span class="note-split-option">
                        <label for="splitbox">Split into multiple notes:</label>
                        <input
                            type="checkbox"
                            id="splitbox"
                            name="splitbox"
                            onInput={handleCheckbox}
                            checked={local.splitIntoMultipleNotes}
                        />
                    </span>
                </form>
                <ImageSelector onPaste={onImagePaste} />
            </CivMain>
        </div>
    );
}

function addNote(
    notes: Array<string>,
    font: Font,
    deckId: Key,
    noteKind: NoteKind,
    prevNoteId?: number,
    nextNoteId?: number,
    optionalPointId?: number,
): Promise<Notes> {
    type ProtoNote = {
        deckId: Key;
        font: Font;
        kind: NoteKind;
        content: Array<string>;
        nextNoteId?: number;
        prevNoteId?: number;
        pointId?: number;
    };

    let protoNote: ProtoNote = {
        deckId,
        font,
        kind: noteKind,
        content: notes,
    };

    if (nextNoteId) {
        // if a nextNoteId is given then we're inserting a note within a sequence of notes
        protoNote.nextNoteId = nextNoteId;
    } else if (prevNoteId) {
        // if nextNoteId is null then this note is being appended onto the end of a seq of notes
        protoNote.prevNoteId = prevNoteId;
    }

    if (optionalPointId) {
        protoNote.pointId = optionalPointId;
    }

    return Net.post<ProtoNote, Notes>("/api/notes", protoNote);
}
