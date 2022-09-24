import { html } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import { useStateValue } from '/js/StateProvider.js';
import { NoteSection, NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

export default function SectionNotes({ onRefsChanged, title, preCacheFn, resource, noappend }) {
    const state = useStateValue();

    const dms = state.deckManagerState.value;
    const deck = dms.deck;

    return html`
    <div>
        ${ deck && dms.hasSummarySection && html`
            <${NoteSection} heading='Summary'
                            noteKind=${ NOTE_KIND_SUMMARY }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY, dms) }
                            deck=${ deck }
                            noteSeq=${ deck.noteSeqs.noteSummary }
                            onRefsChanged=${onRefsChanged}
                            preCacheFn=${preCacheFn}
                            resource=${resource}
                            noappend=${noappend } />`}
        ${ deck && dms.hasReviewSection && html`
            <${NoteSection} heading='Review'
                            noteKind=${ NOTE_KIND_REVIEW }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_REVIEW, dms) }
                            deck=${ deck }
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
                            noteSeq=${ deck.noteSeqs.note }
                            onRefsChanged=${onRefsChanged}
                            preCacheFn=${preCacheFn}
                            resource=${resource}
                            noappend=${noappend } />`}
    </div>`;
}

function howToShowNoteSection(noteKind, deckManagerState) {
    if (noteKind === NOTE_KIND_SUMMARY) {
        if (deckManagerState.hasSummarySection) {
            return deckManagerState.showShowSummaryButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
        } else {
            return NOTE_SECTION_HIDE;
        }
    }

    if (noteKind === NOTE_KIND_REVIEW) {
        if (deckManagerState.hasReviewSection) {
            return deckManagerState.showShowReviewButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
        } else {
            return NOTE_SECTION_HIDE;
        }
    }

    if (noteKind === NOTE_KIND_NOTE) {
        var r = NOTE_SECTION_EXCLUSIVE;
        if (deckManagerState.hasSummarySection && !deckManagerState.showShowSummaryButton) {
            r = NOTE_SECTION_SHOW;
        }
        if (deckManagerState.hasReviewSection && !deckManagerState.showShowReviewButton) {
            r = NOTE_SECTION_SHOW;
        }
        return r;
    }

    return NOTE_SECTION_HIDE;
}
