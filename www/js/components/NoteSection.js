import { html,  useState, useEffect, useRef } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { svgEdit, svgX } from '/js/svgIcons.js';
import { useWasmInterface } from '/js/WasmInterfaceProvider.js';
import { useStateValue } from '/js/StateProvider.js';

import CivilTextArea from '/js/components/CivilTextArea.js';
import ImageWidget from '/js/components/ImageWidget.js';
import Note from '/js/components/Note.js';
import RollableSection from '/js/components/RollableSection.js';
import { WhenWritable } from '/js/components/WhenWritable.js';
import { WhenVerbose } from '/js/components/WhenVerbose.js';

const NOTE_SECTION_HIDE = 0;
const NOTE_SECTION_SHOW = 1;
const NOTE_SECTION_EXCLUSIVE = 2;

const NOTE_KIND_NOTE = 'Note';
const NOTE_KIND_SUMMARY = 'NoteSummary';
const NOTE_KIND_REVIEW = 'NoteReview';
const NOTE_KIND_DECKMETA = 'NoteDeckMeta';

function NoteSection({ heading, noteKind, howToShow, deck, onRefsChanged, cacheDeck }) {
    function noteManager(noteKind) {
        let filterFn = n => (!n.point_id) && n.kind === noteKind;

        let appendLabel = "Append Note";
        if (noteKind === NOTE_KIND_SUMMARY) {
            appendLabel = "Append Summary Note";
        } else if (noteKind === NOTE_KIND_REVIEW) {
            appendLabel = "Append Review Note";
        }

        return NoteManager({
            deck,
            cacheDeck,
            onRefsChanged,
            filterFn,
            appendLabel,
            noteKind
        });
    }

    switch(howToShow) {
    case NOTE_SECTION_HIDE:      return html`<div></div>`;
    case NOTE_SECTION_EXCLUSIVE: return html`${ noteManager(noteKind) }`;
    case NOTE_SECTION_SHOW:      return html`<${RollableSection} heading=${heading}>
                                               ${ noteManager(noteKind) }
                                             </${RollableSection}>`;
    }
}

function NoteManager({ deck, cacheDeck, onRefsChanged, filterFn, optional_deck_point, appendLabel, noteKind }) {
    const [state, dispatch] = useStateValue();

    function findNoteWithId(id, modifyFn) {
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);
        cacheDeck({...deck, notes});
    };

    function onEditedNote(id, data) {
        findNoteWithId(id, (notes, index) => {
            notes[index] = Object.assign(notes[index], data);
        });
    };

    function onDeleteNote(noteId) {
        findNoteWithId(noteId, (notes, index) => {
            notes.splice(index, 1);
        });
    };

    function buildNoteComponent(note) {
        return html`
               <${Note} key=${ note.id }
                        note=${ note }
                        parentDeck=${ deck }
                        onDelete=${ onDeleteNote }
                        onEdited=${ onEditedNote }
                        onRefsChanged=${ onRefsChanged }
               />`;
    }

    function buildNoteForm() {
        function onCancelAddNote(e) {
            dispatch({type: "hideNoteForm", noteKind });
            e.preventDefault();
        };

        function onAddNote(e) {
            e.preventDefault();
            const noteForm = e.target;
            const markup = noteForm.content.value;
            addNote(markup, deck.id, noteKind, optional_deck_point && optional_deck_point.id)
                .then(newNotes => {
                    const notes = deck.notes;
                    newNotes.forEach(n => {
                        notes.push(n);
                    });

                    cacheDeck({...deck, notes});
                    dispatch({type: "hideNoteForm", noteKind });
                })
                .catch(error => console.error(error.message));
        };

        return html`<${NoteForm} onSubmit=${ onAddNote } onCancel=${ onCancelAddNote } />`;
    };

    function buildNoteFormIcon() {
        function onAddNoteClicked(e) {
            dispatch({ type: "showNoteForm", noteKind });
            e.preventDefault();
        };

        if (optional_deck_point) {
            return html`
            <${WhenVerbose}>
                <${WhenWritable}>
                    <div class="inline-append-note">
                        <div class="left-margin-inline">
                            <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
                                ${ svgEdit() }
                                <span class="left-margin-icon-label ui-bold">${ appendLabel }</span>
                            </div>
                        </div>
                    </div>
                </${WhenWritable}>
            </${WhenVerbose}>`;
        } else {
            return html`
            <${WhenVerbose}>
                <${WhenWritable}>
                    <div class="append-note">
                        <div class="left-margin">
                            <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
                                <span class="left-margin-icon-label ui-bold">${ appendLabel }</span>
                                ${ svgEdit() }
                            </div>
                        </div>
                    </div>
                </${WhenWritable}>
            </${WhenVerbose}>`;
        }
    }

    const notes = deck.notes ? deck.notes.filter(filterFn).map(buildNoteComponent) : [];

    return html`
           <section>
               ${ notes }
               ${ state.showNoteForm[noteKind] ? buildNoteForm() : buildNoteFormIcon() }
           </section>`;
}

function NoteForm({ onSubmit, onCancel }) {
    const textAreaRef = useRef(null);

    // need to keep track of the cursor position in case the user:
    // moves cursor to a position within the text and clicks on the ImageWidget
    // to add markup multiple times. The expected result is to have multiple
    // image markups at the point where the cursor was (by default the cursor
    // goes to the end of the content once the first image markup has been added)
    //
    const [local, setLocal] = useState({
        content: '',
        oldCursorPos: 0,
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
            textAreaRef.current.focus();
        }
    }, []);

    function onImagePaste(markup) {
        let content = local.content;


        let cursor;
        if (local.textAreaFocused) {
            cursor = textAreaRef.current.selectionStart;
        } else {
            cursor = local.oldCursorPos;
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
        let cursor = textAreaRef.current.selectionStart;
        setLocal({
            ...local,
            oldCursorPos: cursor,
            textAreaFocused: false
        });
    }

    return html`
           <div class="append-note">
               <div class="left-margin">
                   <div class="left-margin-entry clickable cancel-offset" onClick=${ onCancel }>
                       <span class="left-margin-icon-label">Cancel</span>
                       ${ svgX() }
                   </div>
               </div>
               <form class="civil-add-note-form" onSubmit=${ onSubmit }>
                   <label for="content">Append Note:</label>
                   <br/>
                   <${CivilTextArea} id="content"
                                     elementRef=${ textAreaRef }
                                     elementClass="new-note-textarea"
                                     value=${ local.content }
                                     onFocus=${ onTextAreaFocus }
                                     onBlur=${ onTextAreaBlur }
                                     onInput=${ handleChangeEvent }/>
                   <br/>
                   <input type="submit" value="Save"/>
               </form>
               <${ImageWidget} onPaste=${ onImagePaste }/>
           </div>`;
}

function addNote(markup, deck_id, noteKind, optional_point_id) {
    const wasmInterface = useWasmInterface();
    const notes = wasmInterface.splitter(markup);

    if (notes === null) {
        console.error(markup);
        return new Promise((resolve, reject) => { reject(new Error("addNote: splitIntoNotes failed")); });
    }

    let data = {
        deck_id,
        kind: noteKind,
        content: notes
    };

    if (optional_point_id) {
        data.point_id = optional_point_id;
    }

    function isEmptyNote(n) {
        return n.content.every(n => { return n.length === 0;});
    }

    if (isEmptyNote(data)) {
        return new Promise((resolve, reject) => { reject(new Error("Parsed as empty note")); });
    } else {
        return Net.post("/api/notes", data);
    }
}

export { NoteSection, NoteManager, NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW, NOTE_KIND_DECKMETA }
