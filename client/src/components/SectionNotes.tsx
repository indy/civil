import { h } from "preact";

import {
    DeckKind,
    FatDeck,
    Note,
    NoteKind,
    NoteSectionHowToShow,
    Notes,
    Ref,
    ToolbarMode
} from "../types";

import NoteSection from "./NoteSection";
import RollableSection from "./RollableSection";
import { getAppState } from "../AppState";

type Props = {
    deck: FatDeck;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    title: string;
    deckKind: DeckKind;
    howToShowNoteSection: (noteKind: NoteKind) => NoteSectionHowToShow;
    canShowNoteSection: (noteKind: NoteKind) => boolean;
    onUpdateDeck: (newDeck: FatDeck) => void;
    noappend?: boolean;
};

export default function SectionNotes({
    deck,
    onRefsChanged,
    title,
    deckKind,
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
                    <NoteKindSection
                        heading="Summary"
                        noteKind={NoteKind.NoteSummary}
                        howToShow={howToShowNoteSection(NoteKind.NoteSummary)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        toolbarMode={toolbarMode}
                        notes={deck.noteSeqs.noteSummary}
                        onRefsChanged={onRefsChanged}
                        deckKind={deckKind}
                        noappend={noappend}
                    />
                )}
                {canShowNoteSection(NoteKind.NoteReview) && (
                    <NoteKindSection
                        heading="Review"
                        noteKind={NoteKind.NoteReview}
                        howToShow={howToShowNoteSection(NoteKind.NoteReview)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        toolbarMode={toolbarMode}
                        notes={deck.noteSeqs.noteReview}
                        onRefsChanged={onRefsChanged}
                        deckKind={deckKind}
                        noappend={noappend}
                    />
                )}

                <NoteKindSection
                    heading={title}
                    noteKind={NoteKind.Note}
                    howToShow={howToShowNoteSection(NoteKind.Note)}
                    deck={deck}
                    onUpdateDeck={onUpdateDeck}
                    toolbarMode={toolbarMode}
                    notes={deck.noteSeqs.note}
                    onRefsChanged={onRefsChanged}
                    deckKind={deckKind}
                    noappend={noappend}
                />
            </div>
        );
    } else {
        return <div></div>;
    }
}

type NoteKindSectionProps = {
    heading: string;
    noteKind: NoteKind;
    notes: Notes;
    howToShow: NoteSectionHowToShow;
    deck: FatDeck;
    toolbarMode: ToolbarMode;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    deckKind: DeckKind;
    onUpdateDeck: (d: FatDeck) => void;
    noappend?: boolean;
};

function NoteKindSection({
    heading,
    noteKind,
    notes,
    howToShow,
    deck,
    toolbarMode,
    onRefsChanged,
    onUpdateDeck,
    noappend,
}: NoteKindSectionProps) {
    function noteSection(noteKind: NoteKind) {
        let appendLabel = "Append Note";

        if (noteKind === NoteKind.NoteSummary) {
            appendLabel = "Append Summary Note";
        } else if (noteKind === NoteKind.NoteReview) {
            appendLabel = "Append Review Note";
        }

        return NoteSection({
            deck,
            toolbarMode,
            onUpdateDeck,
            notes,
            onRefsChanged,
            appendLabel,
            noteKind,
            noappend,
        });
    }

    switch (howToShow) {
        case NoteSectionHowToShow.Hide:
            return <div></div>;
        case NoteSectionHowToShow.Exclusive:
            return noteSection(noteKind);
        case NoteSectionHowToShow.Show:
            return (
                <RollableSection heading={heading}>
                    {noteSection(noteKind)}
                </RollableSection>
            );
    }
}
