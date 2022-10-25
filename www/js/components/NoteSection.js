import { html,  useState, useEffect, useRef } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { getAppState, AppStateChange } from '/js/AppState.js';
import { svgEdit } from '/js/svgIcons.js';

import Note from '/js/components/Note.js';
import NoteForm from '/js/components/NoteForm.js';
import RollableSection from '/js/components/RollableSection.js';
import WhenVerbose from '/js/components/WhenVerbose.js';


const NOTE_SECTION_HIDE = 0;
const NOTE_SECTION_SHOW = 1;
const NOTE_SECTION_EXCLUSIVE = 2;

const NOTE_KIND_NOTE = 'Note';
const NOTE_KIND_SUMMARY = 'NoteSummary';
const NOTE_KIND_REVIEW = 'NoteReview';
const NOTE_KIND_DECKMETA = 'NoteDeckMeta';

function NoteSection({ heading, noteKind, noteSeq, howToShow, deck, toolbarMode, onRefsChanged, resource, onUpdateDeck, noappend }) {
    function noteManager(noteKind) {
        let appendLabel = "Append Note";
        if (noteKind === NOTE_KIND_SUMMARY) {
            appendLabel = "Append Summary Note";
        } else if (noteKind === NOTE_KIND_REVIEW) {
            appendLabel = "Append Review Note";
        }

        return NoteManager({
            deck,
            toolbarMode,
            onUpdateDeck,
            noteSeq,
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

function NoteManager({ deck, toolbarMode, onUpdateDeck, noteSeq, resource, onRefsChanged, optionalDeckPoint, appendLabel, noteKind, noappend }) {
    const appState = getAppState();

    function onEditedNote(id, updatedNote) {
        Net.put("/api/notes/" + id.toString(), updatedNote);
    };

    function onDeleteNote(id) {
        Net.delete("/api/notes/" + id.toString()).then(allRemainingNotes => {
            let notes = allRemainingNotes;
            onUpdateDeck({...deck, notes});
        });
    };

    function buildNoteComponent(note) {
        return html`
               <${Note} key=${ note.id }
                        note=${ note }
                        parentDeck=${ deck }
                        toolbarMode=${ toolbarMode }
                        onDelete=${ onDeleteNote }
                        onEdited=${ onEditedNote }
                        onRefsChanged=${ onRefsChanged }
                        onUpdateDeck=${ onUpdateDeck }
               />`;
    }


    function buildNoteForm() {
        function onCancelled(e) {
            AppStateChange.hideNoteForm(noteKind);
            e.preventDefault();
        };

        function onNoteCreated(allNotes) {
            onUpdateDeck({...deck, notes: allNotes});
            AppStateChange.hideNoteForm(noteKind);
        }

        let nextNoteId = null;
        let prevNoteId = (noteSeq && noteSeq.length > 0) ? noteSeq[noteSeq.length - 1].id : null;
        let optionalPointId = optionalDeckPoint && optionalDeckPoint.id

        return html`<${NoteForm} label="Append Note:"
                                 onCreate=${ onNoteCreated }
                                 onCancel=${ onCancelled }
                                 deckId=${ deck.id }
                                 prevNoteId=${ prevNoteId }
                                 nextNoteId=${ nextNoteId }
                                 noteKind=${ noteKind }
                                 optionalPointId=${ optionalPointId }
                                 />`;
    };

    function buildNoteFormIcon() {
        function onAddNoteClicked(e) {
            AppStateChange.showNoteForm(noteKind);
            e.preventDefault();
        };

        if (optionalDeckPoint) {
            return html`
            <${WhenVerbose}>
                <div class="inline-append-note">
                    <div class="left-margin-inline">
                        <div class="left-margin-entry-no-note-on-right fadeable clickable"  onClick=${ onAddNoteClicked }>
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
                        <div class="left-margin-entry-no-note-on-right fadeable clickable"  onClick=${ onAddNoteClicked }>
                            <span class="left-margin-icon-label ui-bold">${ appendLabel }</span>
                            ${ svgEdit() }
                        </div>
                    </div>
                </div>
            </${WhenVerbose}>`;
        }
    }

    const notes = noteSeq ? noteSeq.map(buildNoteComponent) : [];
    const addNoteUI = noappend ? '' : (appState.showNoteForm.value[noteKind] ? buildNoteForm() : buildNoteFormIcon());

    return html`
           <section>
               ${ notes }
               ${ addNoteUI }
           </section>`;
}

export { NoteSection, NoteManager, NoteForm, NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW, NOTE_KIND_DECKMETA }
