import { html,  useState, useEffect, useRef } from '/lib/preact/mod.js';

import { dmsUpdateDeck, sc_hideNoteForm, sc_showNoteForm } from '/js/AppState.js';
import Net from '/js/Net.js';
import { svgEdit, svgX } from '/js/svgIcons.js';
import { useStateValue } from '/js/StateProvider.js';

import CivilTextArea from '/js/components/CivilTextArea.js';
import ImageWidget from '/js/components/ImageWidget.js';
import Note from '/js/components/Note.js';
import RollableSection from '/js/components/RollableSection.js';
import WhenVerbose from '/js/components/WhenVerbose.js';

const NOTE_SECTION_HIDE = 0;
const NOTE_SECTION_SHOW = 1;
const NOTE_SECTION_EXCLUSIVE = 2;

const NOTE_KIND_NOTE = 'Note';
const NOTE_KIND_SUMMARY = 'NoteSummary';
const NOTE_KIND_REVIEW = 'NoteReview';
const NOTE_KIND_DECKMETA = 'NoteDeckMeta';

function NoteSection({ heading, noteKind, noteSeq, howToShow, deck, onRefsChanged, preCacheFn, resource, noappend }) {
    function noteManager(noteKind) {
        let appendLabel = "Append Note";
        if (noteKind === NOTE_KIND_SUMMARY) {
            appendLabel = "Append Summary Note";
        } else if (noteKind === NOTE_KIND_REVIEW) {
            appendLabel = "Append Review Note";
        }

        return NoteManager({
            deck,
            noteSeq,
            preCacheFn,
            resource,
            onRefsChanged,
            appendLabel,
            noteKind,
            noappend
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

function NoteManager({ deck, noteSeq, preCacheFn, resource, onRefsChanged, optionalDeckPoint, appendLabel, noteKind, noappend }) {
    const state = useStateValue();

    function findNoteWithId(id, modifyFn) {
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);

        dmsUpdateDeck(state, preCacheFn({...deck, notes}), resource);
    };

    function onEditedNote(id, data) {
        findNoteWithId(id, (notes, index) => {
            notes[index] = Object.assign(notes[index], data);
        });
    };

    function onDeleteNote(noteId, allNotes) {
        dmsUpdateDeck(state, preCacheFn({...deck, notes: allNotes}), resource);
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
            sc_hideNoteForm(state, noteKind);
            e.preventDefault();
        };

        function onAddNote(e) {
            e.preventDefault();
            const noteForm = e.target;
            const markup = noteForm.content.value;
            let prevNoteId;

            if(noteSeq.length > 0) {
                prevNoteId = noteSeq[noteSeq.length - 1].id;
            } else {
                prevNoteId = null;
            }

            let nextNoteId = null; // don't need a nextNoteId if we give addNote a non-null prevNoteId
            // if we're adding a note note to the beginning of the noteseq then we'll need a nextNoteId


            // a test to see if adding a note to the beginning of a noteseq works
            //
            // prevNoteId = null;
            // nextNoteId = noteSeq[0].id;

            addNote(state.wasmInterface, markup, deck.id, prevNoteId, nextNoteId, noteKind, optionalDeckPoint && optionalDeckPoint.id)
                .then(allNotes => {
                    dmsUpdateDeck(state, preCacheFn({...deck, notes: allNotes}), resource);
                    sc_hideNoteForm(state, noteKind);
                })
                .catch(error => console.error(error.message));
        };

        return html`<${NoteForm} onSubmit=${ onAddNote } onCancel=${ onCancelAddNote } />`;
    };

    function buildNoteFormIcon() {
        function onAddNoteClicked(e) {
            sc_showNoteForm(state, noteKind);
            e.preventDefault();
        };

        if (optionalDeckPoint) {
            return html`
            <${WhenVerbose}>
                <div class="inline-append-note">
                    <div class="left-margin-inline">
                        <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
                            ${ svgEdit() }
                            <span class="left-margin-icon-label ui-bold">${ appendLabel }</span>
                        </div>
                    </div>
                </div>
            </${WhenVerbose}>`;
        } else {
            return html`
            <${WhenVerbose}>
                <div class="append-note">
                    <div class="left-margin">
                        <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
                            <span class="left-margin-icon-label ui-bold">${ appendLabel }</span>
                            ${ svgEdit() }
                        </div>
                    </div>
                </div>
            </${WhenVerbose}>`;
        }
    }

    const notes = noteSeq ? noteSeq.map(buildNoteComponent) : [];
    const addNoteUI = noappend ? '' : (state.showNoteForm.value[noteKind] ? buildNoteForm() : buildNoteFormIcon());

    return html`
           <section>
               ${ notes }
               ${ addNoteUI }
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

function addNote(wasmInterface, markup, deckId, prevNoteId, nextNoteId, noteKind, optionalPointId) {
    const notes = wasmInterface.splitter(markup);

    if (notes === null) {
        console.error(markup);
        return new Promise((resolve, reject) => { reject(new Error("addNote: splitIntoNotes failed")); });
    }

    let data = {
        deckId,
        kind: noteKind,
        content: notes
    };

    if (prevNoteId) {
        data.prevNoteId = prevNoteId;
    } else if (nextNoteId) {
        data.nextNoteId = nextNoteId;
    }

    if (optionalPointId) {
        data.pointId = optionalPointId;
    }

    function isEmptyNote(n) {
        return n.content.every(n => { return n.length === 0;});
    }

    // console.log(data);

    if (isEmptyNote(data)) {
        return new Promise((resolve, reject) => { reject(new Error("Parsed as empty note")); });
    } else {
        // returns _all_ the notes associated with the deck
        return Net.post("/api/notes", data);
    }
}

export { NoteSection, NoteManager, NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW, NOTE_KIND_DECKMETA }
