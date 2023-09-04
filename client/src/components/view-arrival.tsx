import { h } from "preact";
import { useState } from "preact/hooks";

import { FlashCard, FatDeck, Arrival, Note, Passage } from "types";

import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import buildMarkup from "components/build-markup";
import ViewReference from "components/view-reference";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import FlashCardIndicator from "components/flashcard-indicator";
import ViewFlashCard from "components/view-flashcard";

type ViewArrivalProps = {
    deck: FatDeck;
    arrival: Arrival;
};

export default function ViewArrival({ deck, arrival }: ViewArrivalProps) {
    let heading = (
        <span class="font-size-1-point-6">
            <DeckLink slimDeck={arrival.deck} />
        </span>
    );

    return (
        <Expandable heading={heading}>
            {arrival.passages.map((passage) => (
                <ViewPassageWithinArrival deck={deck} passage={passage} />
            ))}
        </Expandable>
    );
}

type ViewPassageWithinArrivalProps = {
    deck: FatDeck;
    passage: Passage;
};

function ViewPassageWithinArrival({
    deck,
    passage,
}: ViewPassageWithinArrivalProps) {
    let lastIdx = passage.length - 1;
    let notes = passage.map((note, idx) => {
        return <ArrivalNote deck={deck} note={note} isLast={idx === lastIdx} />;
    });

    return <div class="c-view-passage-within-back-deck">{notes}</div>;
}

type ArrivalNoteProps = {
    deck: FatDeck;
    note: Note;
    isLast: boolean;
};

function ArrivalNote({ deck, note, isLast }: ArrivalNoteProps) {
    const [showFlashCard, setShowFlashCard] = useState(
        note.flashcards.map(() => false)
    );

    function buildTopAnnotation(annotation: string) {
        const scribbleClasses = `ref-top-scribble`;
        return (
            <CivContainer>
                <CivMain>
                    <div class={scribbleClasses}>{annotation}</div>
                </CivMain>
            </CivContainer>
        );
    }

    // this note will contain a ref to the destination deck
    // find that ref and display the annotation it might have
    //
    let linkingRef = note.refs.find((r) => {
        return r.id === deck.id;
    });
    let annotation: string | undefined = undefined;
    if (linkingRef) {
        annotation = linkingRef.annotation;
    } else {
        console.error(`Deck not a ref in Arrival ???? id:${deck.id}???`);
    }

    function onClickedFlashcard(_f: FlashCard, index: number) {
        let newshowFlashCard = [...showFlashCard];
        newshowFlashCard[index] = !newshowFlashCard[index];
        setShowFlashCard(newshowFlashCard);
    }

    function flashCardDeleted(flashcard: FlashCard) {
        console.log(flashcard);
    }

    return (
        <div>
            {annotation && buildTopAnnotation(annotation!)}
            <CivContainer>
                <CivLeft>
                    {note.flashcards.map((flashcard, i) => {
                        return (
                            <FlashCardIndicator
                                flashcard={flashcard}
                                index={i}
                                onClick={onClickedFlashcard}
                            />
                        );
                    })}
                    {note.refs
                        .filter((r) => {
                            return r.id !== deck.id;
                        })
                        .map((ref) => (
                            <ViewReference
                                reference={ref}
                                extraClasses="left-margin-entry"
                            />
                        ))}
                </CivLeft>
                {note.flashcards
                    .filter((_f, i) => showFlashCard[i])
                    .map((f) => {
                        return (
                            <ViewFlashCard
                                flashcard={f}
                                onDelete={flashCardDeleted}
                            />
                        );
                    })}
                <CivMain>
                    {buildMarkup(note.content, note.font, note.id)}
                    {!isLast && <hr />}
                </CivMain>
            </CivContainer>
        </div>
    );
}
