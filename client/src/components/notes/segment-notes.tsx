import { h } from "preact";

import {
    DeckKind,
    FatDeck,
    Note,
    NoteKind,
    PassageHowToShow,
    Notes,
    Reference,
    CivilMode,
} from "types";

import Passage from "components/notes/passage";
import RollableSegment from "components/rollable-segment";
import { getAppState } from "app-state";
import { CivContainer, CivMain } from "components/civil-layout";

type Props = {
    deck: FatDeck;
    onRefsChanged: (note: Note, allDecksForNote: Array<Reference>) => void;
    title: string;
    deckKind: DeckKind;
    howToShowPassage: (noteKind: NoteKind) => PassageHowToShow;
    canShowPassage: (noteKind: NoteKind) => boolean;
    onUpdateDeck: (newDeck: FatDeck) => void;
    noAppend?: boolean;
    noDelete?: boolean;
};

export default function SegmentNotes({
    deck,
    onRefsChanged,
    title,
    deckKind,
    howToShowPassage,
    canShowPassage,
    onUpdateDeck,
    noAppend,
    noDelete,
}: Props) {
    const appState = getAppState();

    const mode = appState.mode.value;

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
                        mode={mode}
                        notes={deck.noteSeqs.noteSummary}
                        onRefsChanged={onRefsChanged}
                        deckKind={deckKind}
                        noAppend={noAppend}
                        noDelete={noDelete}
                    />
                )}
                {canShowPassage(NoteKind.NoteReview) && (
                    <NoteKindPassage
                        heading="Review"
                        noteKind={NoteKind.NoteReview}
                        howToShow={howToShowPassage(NoteKind.NoteReview)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        mode={mode}
                        notes={deck.noteSeqs.noteReview}
                        onRefsChanged={onRefsChanged}
                        deckKind={deckKind}
                        noAppend={noAppend}
                        noDelete={noDelete}
                    />
                )}

                <NoteKindPassage
                    heading={title}
                    noteKind={NoteKind.Note}
                    howToShow={howToShowPassage(NoteKind.Note)}
                    deck={deck}
                    onUpdateDeck={onUpdateDeck}
                    mode={mode}
                    notes={deck.noteSeqs.note}
                    onRefsChanged={onRefsChanged}
                    deckKind={deckKind}
                    noAppend={noAppend}
                    noDelete={noDelete}
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
    mode: CivilMode;
    onRefsChanged: (note: Note, allDecksForNote: Array<Reference>) => void;
    deckKind: DeckKind;
    onUpdateDeck: (d: FatDeck) => void;
    noAppend?: boolean;
    noDelete?: boolean;
};

function NoteKindPassage({
    heading,
    noteKind,
    notes,
    howToShow,
    deck,
    mode,
    onRefsChanged,
    onUpdateDeck,
    noAppend,
    noDelete,
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
            mode,
            onUpdateDeck,
            notes,
            onRefsChanged,
            appendLabel,
            noteKind,
            noAppend,
            noDelete,
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
                    <CivContainer>
                        <CivMain>{notePassage(noteKind)}</CivMain>
                    </CivContainer>
                </RollableSegment>
            );
    }
}
