import { h } from "preact";

import { getAppState } from "../AppState";

import {
    NoteSection,
    NOTE_KIND_NOTE,
    NOTE_KIND_SUMMARY,
    NOTE_KIND_REVIEW,
} from "./NoteSection";

export default function SectionNotes({
    deck,
    onRefsChanged,
    title,
    resource,
    howToShowNoteSection,
    canShowNoteSection,
    onUpdateDeck,
    noappend,
}: {
    deck?: any;
    onRefsChanged?: any;
    title?: any;
    resource?: any;
    howToShowNoteSection?: any;
    canShowNoteSection?: any;
    onUpdateDeck?: any;
    noappend?: any;
}) {
    const appState = getAppState();

    const toolbarMode = appState.toolbarMode.value;

    return (
        <div>
            {deck && canShowNoteSection(NOTE_KIND_SUMMARY) && (
                <NoteSection
                    heading="Summary"
                    noteKind={NOTE_KIND_SUMMARY}
                    howToShow={howToShowNoteSection(NOTE_KIND_SUMMARY)}
                    deck={deck}
                    onUpdateDeck={onUpdateDeck}
                    toolbarMode={toolbarMode}
                    noteSeq={deck.noteSeqs.noteSummary}
                    onRefsChanged={onRefsChanged}
                    resource={resource}
                    noappend={noappend}
                />
            )}
            {deck && canShowNoteSection(NOTE_KIND_REVIEW) && (
                <NoteSection
                    heading="Review"
                    noteKind={NOTE_KIND_REVIEW}
                    howToShow={howToShowNoteSection(NOTE_KIND_REVIEW)}
                    deck={deck}
                    onUpdateDeck={onUpdateDeck}
                    toolbarMode={toolbarMode}
                    noteSeq={deck.noteSeqs.noteReview}
                    onRefsChanged={onRefsChanged}
                    resource={resource}
                    noappend={noappend}
                />
            )}
            {deck && (
                <NoteSection
                    heading={title}
                    noteKind={NOTE_KIND_NOTE}
                    howToShow={howToShowNoteSection(NOTE_KIND_NOTE)}
                    deck={deck}
                    onUpdateDeck={onUpdateDeck}
                    toolbarMode={toolbarMode}
                    noteSeq={deck.noteSeqs.note}
                    onRefsChanged={onRefsChanged}
                    resource={resource}
                    noappend={noappend}
                />
            )}
        </div>
    );
}
