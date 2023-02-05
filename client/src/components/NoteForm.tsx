import { h } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";

import Net from '../Net';
import { svgX } from '../svgIcons';
import { getAppState } from '../AppState';

import CivilTextArea from './CivilTextArea';
import ImageSelector from './ImageSelector';

export default function NoteForm({ label, onCreate, onCancel, deckId, prevNoteId, nextNoteId, noteKind, optionalPointId }: { label?: any, onCreate?: any, onCancel?: any, deckId?: any, prevNoteId?: any, nextNoteId?: any, noteKind?: any, optionalPointId?: any }) {
    const appState = getAppState();
    const textAreaRef = useRef(null);

    // need to keep track of the cursor position in case the user:
    // moves cursor to a position within the text and clicks on the ImageSelector
    // to add markup multiple times. The expected result is to have multiple
    // image markups at the point where the cursor was (by default the cursor
    // goes to the end of the content once the first image markup has been added)
    //
    const [local, setLocal] = useState({
        content: '',
        oldCursorPos: 0,
        splitIntoMultipleNotes: true,
        textAreaFocused: false
    });

    const handleChangeEvent = (event) => {
        const target = event.target;
        const name = target.name;
        const value = target.value;

        if (name === 'content') {
            setLocal({
                ...local,
                content: value
            })
        }
    };

    useEffect(() => {
        if (textAreaRef.current) {
            // todo: casting check
            const tar = textAreaRef.current as HTMLElement;
            tar.focus();
        }
    }, []);

    function onImagePaste(markup) {
        let content = local.content;


        let cursor = local.oldCursorPos;
        if (local.textAreaFocused) {

            if (textAreaRef.current) {
                // todo: casting check
                const tar = textAreaRef.current as HTMLTextAreaElement;
                cursor = tar.selectionStart;
            }

            // cursor = textAreaRef.current.selectionStart;
        }

        let newContent = content.slice(0, cursor) + markup + " " + content.slice(cursor);

        setLocal({
            ...local,
            oldCursorPos: cursor + markup.length + 1,
            content: newContent
        });
    }

    function onTextAreaFocus() {
        setLocal({
            ...local,
            textAreaFocused: true
        });
    }

    function onTextAreaBlur() {
        if (textAreaRef.current) {
            // todo: casting check
            const tar = textAreaRef.current as HTMLTextAreaElement;
            let cursor = tar.selectionStart;

            setLocal({
                ...local,
                oldCursorPos: cursor,
                textAreaFocused: false
            });
        }
    }

    function onSubmit(e) {
        e.preventDefault();

        if (appState.wasmInterface) {
            const noteForm = e.target;
            const markup = noteForm.content.value;
            const notes = local.splitIntoMultipleNotes ? appState.wasmInterface.splitter(markup) : [markup];

            addNote(notes, deckId, prevNoteId, nextNoteId, noteKind, optionalPointId)
                .then(allNotes => {
                    onCreate(allNotes);
                })
                .catch(error => console.error(error.message));
        }
    }

    function handleCheckbox(e) {
        setLocal({
            ...local,
            splitIntoMultipleNotes: !local.splitIntoMultipleNotes
        })
    }

    return (<div class="append-note">
               <div class="left-margin">
                   <div class="left-margin-entry fadeable clickable cancel-offset" onClick={ onCancel }>
                       <span class="left-margin-icon-label">Cancel</span>
                       { svgX() }
                   </div>
               </div>
               <form class="civil-add-note-form" onSubmit={ onSubmit }>
                   <label for="content">{ label }</label>
                   <br/>
                   <CivilTextArea id="content"
                                  elementRef={ textAreaRef }
                                  elementClass="new-note-textarea"
                                  value={ local.content }
                                  onFocus={ onTextAreaFocus }
                                  onBlur={ onTextAreaBlur }
                                  onInput={ handleChangeEvent }/>
                   <br/>
                   <input type="submit" value="Save"/>
                   <span class="note-split-option">
                       <label for="splitbox">Split into multiple notes:</label>
                       <input type="checkbox"
                              id="splitbox"
                              name="splitbox"
                              onInput={ handleCheckbox }
                              checked={ local.splitIntoMultipleNotes }/>
                   </span>
               </form>
               <ImageSelector onPaste={ onImagePaste }/>
           </div>);
}

function addNote(notes?: any, deckId?: any, prevNoteId?: any, nextNoteId?: any, noteKind?: any, optionalPointId?: any) {


    let data: {
        deckId?: any,
        kind?: any
        content?: any,
        nextNoteId?: any,
        prevNoteId?: any,
        pointId?: any
    } = {
        deckId,
        kind: noteKind,
        content: notes
    };

    if (nextNoteId) {
        // if a nextNoteId is given then we're inserting a note within a sequence of notes
        data.nextNoteId = nextNoteId;
    } else if (prevNoteId) {
        // if nextNoteId is null then this note is being appended onto the end of a seq of notes
        data.prevNoteId = prevNoteId;
    }

    if (optionalPointId) {
        data.pointId = optionalPointId;
    }

    // console.log(data);
    return Net.post("/api/notes", data);
}
