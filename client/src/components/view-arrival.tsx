import { h } from "preact";

import { FatDeck, Arrival, Note, Passage } from "types";

import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import buildMarkup from "components/build-markup";
import ViewReference from "components/view-reference";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import useFlashcards from "components/use-flashcards";

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
    const [flashcardIndicators, maximisedFlashcards] = useFlashcards(note.flashcards);

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

    return (
        <div>
            {annotation && buildTopAnnotation(annotation!)}
            <CivContainer>
                <CivLeft>
                    {flashcardIndicators}
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
                {maximisedFlashcards}
                <CivMain>
                    {buildMarkup(note.content, note.font, note.id)}
                    {!isLast && <hr />}
                </CivMain>
            </CivContainer>
        </div>
    );
}
