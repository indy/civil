import { h } from "preact";

import {
    DeckKind,
    FatDeck,
    Note,
    NoteKind,
    PassageHowToShow,
    Notes,
    Ref,
    ToolbarMode,
} from "types";

import Passage from "components/notes/passage";
import RollableSegment from "components/rollable-segment";
import { getAppState } from "app-state";

type Props = {
    deck: FatDeck;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    title: string;
    deckKind: DeckKind;
    howToShowPassage: (noteKind: NoteKind) => PassageHowToShow;
    canShowPassage: (noteKind: NoteKind) => boolean;
    onUpdateDeck: (newDeck: FatDeck) => void;
    noappend?: boolean;
};

export default function SegmentNotes({
    deck,
    onRefsChanged,
    title,
    deckKind,
    howToShowPassage,
    canShowPassage,
    onUpdateDeck,
    noappend,
}: Props) {
    const appState = getAppState();

    const toolbarMode = appState.toolbarMode.value;

    if (deck && deck.noteSeqs) {
        return (
            <div>
                {canShowPassage(NoteKind.NoteSummary) && (
                    <NoteKindPassage
                        heading="Summary"
                        noteKind={NoteKind.NoteSummary}
                        howToShow={howToShowPassage(NoteKind.NoteSummary)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        toolbarMode={toolbarMode}
                        notes={deck.noteSeqs.noteSummary}
                        onRefsChanged={onRefsChanged}
                        deckKind={deckKind}
                        noappend={noappend}
                    />
                )}
                {canShowPassage(NoteKind.NoteReview) && (
                    <NoteKindPassage
                        heading="Review"
                        noteKind={NoteKind.NoteReview}
                        howToShow={howToShowPassage(NoteKind.NoteReview)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        toolbarMode={toolbarMode}
                        notes={deck.noteSeqs.noteReview}
                        onRefsChanged={onRefsChanged}
                        deckKind={deckKind}
                        noappend={noappend}
                    />
                )}

                <NoteKindPassage
                    heading={title}
                    noteKind={NoteKind.Note}
                    howToShow={howToShowPassage(NoteKind.Note)}
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

type NoteKindPassageProps = {
    heading: string;
    noteKind: NoteKind;
    notes: Notes;
    howToShow: PassageHowToShow;
    deck: FatDeck;
    toolbarMode: ToolbarMode;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    deckKind: DeckKind;
    onUpdateDeck: (d: FatDeck) => void;
    noappend?: boolean;
};

function NoteKindPassage({
    heading,
    noteKind,
    notes,
    howToShow,
    deck,
    toolbarMode,
    onRefsChanged,
    onUpdateDeck,
    noappend,
}: NoteKindPassageProps) {
    function notePassage(noteKind: NoteKind) {
        let appendLabel = "Append Note";

        if (noteKind === NoteKind.NoteSummary) {
            appendLabel = "Append Summary Note";
        } else if (noteKind === NoteKind.NoteReview) {
            appendLabel = "Append Review Note";
        }

        return Passage({
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
        case PassageHowToShow.Hide:
            return <div></div>;
        case PassageHowToShow.Exclusive:
            return notePassage(noteKind);
        case PassageHowToShow.Show:
            return (
                <RollableSegment heading={heading}>
                    {notePassage(noteKind)}
                </RollableSegment>
            );
    }
}
