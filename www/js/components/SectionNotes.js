import { html } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import { useAppState } from '/js/AppStateProvider.js';
import { NoteSection, NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

export default function SectionNotes({ onRefsChanged, title, preCacheFn, resource, noappend }) {
    const appState = useAppState();

    const toolbarMode = appState.toolbarMode.value;
    const dms = appState.deckManagerState.value;
    const deck = dms.deck;

    return html`
    <div>
        ${ deck && dms.canHaveSummarySection && html`
            <${NoteSection} heading='Summary'
                            noteKind=${ NOTE_KIND_SUMMARY }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY, dms) }
                            deck=${ deck }
                            toolbarMode=${ toolbarMode }
                            noteSeq=${ deck.noteSeqs.noteSummary }
                            onRefsChanged=${onRefsChanged}
                            preCacheFn=${preCacheFn}
                            resource=${resource}
                            noappend=${noappend } />`}
        ${ deck && dms.canHaveReviewSection && html`
            <${NoteSection} heading='Review'
                            noteKind=${ NOTE_KIND_REVIEW }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_REVIEW, dms) }
                            deck=${ deck }
                            toolbarMode=${ toolbarMode }
                            noteSeq=${ deck.noteSeqs.noteReview }
                            onRefsChanged=${onRefsChanged}
                            preCacheFn=${preCacheFn}
                            resource=${resource}
                            noappend=${noappend } />`}
        ${ deck && html`
            <${NoteSection} heading=${ title }
                            noteKind=${ NOTE_KIND_NOTE }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_NOTE, dms) }
                            deck=${ deck }
                            toolbarMode=${ toolbarMode }
                            noteSeq=${ deck.noteSeqs.note }
                            onRefsChanged=${onRefsChanged}
                            preCacheFn=${preCacheFn}
                            resource=${resource}
                            noappend=${noappend } />`}
    </div>`;
}

function howToShowNoteSection(noteKind, deckManagerState) {
    if (noteKind === NOTE_KIND_SUMMARY) {
        if (deckManagerState.canHaveSummarySection) {
            return deckManagerState.displayShowSummaryButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
        } else {
            return NOTE_SECTION_HIDE;
        }
    }

    if (noteKind === NOTE_KIND_REVIEW) {
        if (deckManagerState.canHaveReviewSection) {
            return deckManagerState.displayShowReviewButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
        } else {
            return NOTE_SECTION_HIDE;
        }
    }

    if (noteKind === NOTE_KIND_NOTE) {
        var r = NOTE_SECTION_EXCLUSIVE;
        if (deckManagerState.canHaveSummarySection && !deckManagerState.displayShowSummaryButton) {
            r = NOTE_SECTION_SHOW;
        }
        if (deckManagerState.canHaveReviewSection && !deckManagerState.displayShowReviewButton) {
            r = NOTE_SECTION_SHOW;
        }
        return r;
    }

    return NOTE_SECTION_HIDE;
}
