import { h } from "preact";

import {
    DeckKind,
    IDeckCore,
    Note,
    NoteKind,
    NoteSectionHowToShow,
    Ref,
} from "../types";

import { getAppState } from "../AppState";

import { NoteSection } from "./NoteSection";

type Props = {
    deck: IDeckCore;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    title: string;
    resource: DeckKind;
    howToShowNoteSection: (noteKind: NoteKind) => NoteSectionHowToShow;
    canShowNoteSection: (noteKind: NoteKind) => boolean;
    onUpdateDeck: (newDeck: IDeckCore) => void;
    noappend?: boolean;
};

export default function SectionNotes({
    deck,
    onRefsChanged,
    title,
    resource,
    howToShowNoteSection,
    canShowNoteSection,
    onUpdateDeck,
    noappend,
}: Props) {
    const appState = getAppState();

    const toolbarMode = appState.toolbarMode.value;

    if (deck && deck.noteSeqs) {
        return (
            <div>
                {canShowNoteSection(NoteKind.NoteSummary) && (
                    <NoteSection
                        heading="Summary"
                        noteKind={NoteKind.NoteSummary}
                        howToShow={howToShowNoteSection(NoteKind.NoteSummary)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        toolbarMode={toolbarMode}
                        notes={deck.noteSeqs.noteSummary}
                        onRefsChanged={onRefsChanged}
                        resource={resource}
                        noappend={noappend}
                    />
                )}
                {canShowNoteSection(NoteKind.NoteReview) && (
                    <NoteSection
                        heading="Review"
                        noteKind={NoteKind.NoteReview}
                        howToShow={howToShowNoteSection(NoteKind.NoteReview)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        toolbarMode={toolbarMode}
                        notes={deck.noteSeqs.noteReview}
                        onRefsChanged={onRefsChanged}
                        resource={resource}
                        noappend={noappend}
                    />
                )}

                <NoteSection
                    heading={title}
                    noteKind={NoteKind.Note}
                    howToShow={howToShowNoteSection(NoteKind.Note)}
                    deck={deck}
                    onUpdateDeck={onUpdateDeck}
                    toolbarMode={toolbarMode}
                    notes={deck.noteSeqs.note}
                    onRefsChanged={onRefsChanged}
                    resource={resource}
                    noappend={noappend}
                />
            </div>
        );
    } else {
        return <div></div>;
    }
}
