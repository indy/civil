import { html } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { getAppState } from '/js/AppState.js';

import { NoteSection,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

export default function SectionNotes({ deck, onRefsChanged, title, resource, howToShowNoteSection, canShowNoteSection, onUpdateDeck, noappend }) {
    const appState = getAppState();

    const toolbarMode = appState.toolbarMode.value;

    return html`
    <div>
        ${ deck && canShowNoteSection(NOTE_KIND_SUMMARY) && html`
            <${NoteSection} heading='Summary'
                            noteKind=${ NOTE_KIND_SUMMARY }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY) }
                            deck=${ deck }
                            onUpdateDeck=${onUpdateDeck}
                            toolbarMode=${ toolbarMode }
                            noteSeq=${ deck.noteSeqs.noteSummary }
                            onRefsChanged=${onRefsChanged}
                            resource=${resource}
                            noappend=${noappend } />`}
        ${ deck && canShowNoteSection(NOTE_KIND_REVIEW) && html`
            <${NoteSection} heading='Review'
                            noteKind=${ NOTE_KIND_REVIEW }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_REVIEW) }
                            deck=${ deck }
                            onUpdateDeck=${onUpdateDeck}
                            toolbarMode=${ toolbarMode }
                            noteSeq=${ deck.noteSeqs.noteReview }
                            onRefsChanged=${onRefsChanged}
                            resource=${resource}
                            noappend=${noappend } />`}
        ${ deck && html`
            <${NoteSection} heading=${ title }
                            noteKind=${ NOTE_KIND_NOTE }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_NOTE) }
                            deck=${ deck }
                            onUpdateDeck=${onUpdateDeck}
                            toolbarMode=${ toolbarMode }
                            noteSeq=${ deck.noteSeqs.note }
                            onRefsChanged=${onRefsChanged}
                            resource=${resource}
                            noappend=${noappend } />`}
    </div>`;
}
