import { h } from "preact";

import Net from '../Net';
import { getAppState, AppStateChange } from '../AppState';
import { svgEdit } from '../svgIcons';

import Note from './Note';
import NoteForm from './NoteForm';
import RollableSection from './RollableSection';
import WhenVerbose from './WhenVerbose';

import { NoteSectionHowToShow } from '../types';

const NOTE_KIND_NOTE = 'Note';
const NOTE_KIND_SUMMARY = 'NoteSummary';
const NOTE_KIND_REVIEW = 'NoteReview';
const NOTE_KIND_DECKMETA = 'NoteDeckMeta';

function NoteSection({ heading, noteKind, noteSeq, howToShow, deck, toolbarMode, onRefsChanged, resource, onUpdateDeck, noappend }: { heading?: any, noteKind?: any, noteSeq?: any, howToShow?: NoteSectionHowToShow, deck?: any, toolbarMode?: any, onRefsChanged?: any, resource?: any, onUpdateDeck?: any, noappend?: any }) {

    function noteManager(noteKind: any) {
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

    // todo: typescript: better way of going through the enums
    if (howToShow === NoteSectionHowToShow.Hide) {
        return (<div></div>);
    } else if (howToShow === NoteSectionHowToShow.Exclusive) {
        return noteManager(noteKind);
    } else if (howToShow === NoteSectionHowToShow.Show) {
        return (<RollableSection heading={heading}>
                    { noteManager(noteKind) }
                </RollableSection>);
    }

    // todo: will never get here, fix typescript so that this line can be removed
    return (<div></div>);
}

function NoteManager({ deck, toolbarMode, onUpdateDeck, noteSeq, resource, onRefsChanged, optionalDeckPoint, appendLabel, noteKind, noappend }: { deck?: any, toolbarMode?: any, onUpdateDeck?: any, noteSeq?: any, resource?: any, onRefsChanged?: any, optionalDeckPoint?: any, appendLabel?: any, noteKind?: any, noappend?: any }) {

    const appState = getAppState();

    function onEditedNote(id, updatedNote) {
        Net.put("/api/notes/" + id.toString(), updatedNote);
    };

    function onDeleteNote(id) {
        Net.delete("/api/notes/" + id.toString(), '').then(allRemainingNotes => {
            let notes = allRemainingNotes;
            onUpdateDeck({...deck, notes});
        });
    };

    function buildNoteComponent(note) {
        return (<Note key={ note.id }
                        note={ note }
                        parentDeck={ deck }
                        toolbarMode={ toolbarMode }
                        onDelete={ onDeleteNote }
                        onEdited={ onEditedNote }
                        onRefsChanged={ onRefsChanged }
                        onUpdateDeck={ onUpdateDeck }
               />);
    }


    function buildNoteForm() {
        function onCancelled(e: Event) {

            AppStateChange.hideNoteForm(noteKind);
            e.preventDefault();
        };

        function onNoteCreated(allNotes: any) {
            onUpdateDeck({...deck, notes: allNotes});
            AppStateChange.hideNoteForm(noteKind);
        }

        let nextNoteId = null;
        let prevNoteId = (noteSeq && noteSeq.length > 0) ? noteSeq[noteSeq.length - 1].id : null;
        let optionalPointId = optionalDeckPoint && optionalDeckPoint.id

        return (<NoteForm label="Append Note:"
                          onCreate={ onNoteCreated }
                          onCancel={ onCancelled }
                          deckId={ deck.id }
                          prevNoteId={ prevNoteId }
                          nextNoteId={ nextNoteId }
                          noteKind={ noteKind }
                          optionalPointId={ optionalPointId }
                                 />);
    };

    function buildNoteFormIcon() {
        function onAddNoteClicked(e) {
            AppStateChange.showNoteForm(noteKind);
            e.preventDefault();
        };

        if (optionalDeckPoint) {
            return (<WhenVerbose>
                <div class="inline-append-note">
                    <div class="left-margin-inline">
                        <div class="left-margin-entry-no-note-on-right fadeable clickable"  onClick={ onAddNoteClicked }>
                            { svgEdit() }
                            <span class="left-margin-icon-label ui-bold">{ appendLabel }</span>
                        </div>
                    </div>
                </div>
            </WhenVerbose>);
        } else {
            return (<WhenVerbose>
                <div class="append-note">
                    <div class="left-margin">
                        <div class="left-margin-entry-no-note-on-right fadeable clickable"  onClick={ onAddNoteClicked }>
                            <span class="left-margin-icon-label ui-bold">{ appendLabel }</span>
                            { svgEdit() }
                        </div>
                    </div>
                </div>
            </WhenVerbose>);
        }
    }

    const notes = noteSeq ? noteSeq.map(buildNoteComponent) : [];
    const addNoteUI = noappend ? '' : (appState.showNoteForm.value[noteKind] ? buildNoteForm() : buildNoteFormIcon());

    return (<section>
                { notes }
                { addNoteUI }
            </section>);
}

export { NoteSection, NoteManager, NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW, NOTE_KIND_DECKMETA }
