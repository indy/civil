import { h } from "preact";

import {
    DeckKind,
    FatDeck,
    Note,
    NoteKind,
    Notes,
    PassageHowToShow,
    Reference,
    RenderingDeckPart,
} from "types";

import { fontClass } from "shared/font";

import RollableSegment from "components/rollable-segment";
import ViewPassageChunkyBoy from "components/view-passage-chunky-boy";

type Props = {
    deck: FatDeck;
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
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
    if (deck) {
        let containerClasses = "c-segment-notes ";
        containerClasses += fontClass(deck.font, RenderingDeckPart.Body);

        return (
            <div class={containerClasses}>
                {canShowPassage(NoteKind.NoteSummary) && (
                    <NoteKindPassage
                        heading="Summary"
                        noteKind={NoteKind.NoteSummary}
                        howToShow={howToShowPassage(NoteKind.NoteSummary)}
                        deck={deck}
                        onUpdateDeck={onUpdateDeck}
                        notes={deck.passage[NoteKind.NoteSummary]}
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
                        notes={deck.passage[NoteKind.NoteReview]}
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
                    notes={deck.passage[NoteKind.Note]}
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
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
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

        return ViewPassageChunkyBoy({
            deck,
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
                <RollableSegment heading={heading} font={deck.font}>
                    {notePassage(noteKind)}
                </RollableSegment>
            );
    }
}
