import type { FatDeck, Arrival, Note, Passage } from "../types";

import DeckLink from "./deck-link";
import Expandable from "./expandable";
import buildMarkup from "./build-markup";
import ViewReference from "./view-reference";
import ViewSelfReference from "./view-self-reference";
import { CivContainer, CivMain, CivLeft } from "./civil-layout";
import useFlashcards from "./use-flashcards";

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

    let lastIdx = arrival.passages.length - 1;
    let passages = arrival.passages.map((passage, idx) => (
        <ViewPassageWithinArrival
            deck={deck}
            passage={passage}
            isLast={idx === lastIdx}
        />
    ));

    return <Expandable heading={heading}>{passages}</Expandable>;
}

type ViewPassageWithinArrivalProps = {
    deck: FatDeck;
    passage: Passage;
    isLast: boolean;
};

function ViewPassageWithinArrival({
    deck,
    passage,
    isLast,
}: ViewPassageWithinArrivalProps) {
    // the 'isLast' argument is true when this is the last passage in the arrival
    // so if that's true, don't render the final <hr> for the last ArrivalNote
    //
    let lastIdx = passage.length - 1;
    let notes = passage.map((note, idx) => {
        let renderDivider = !isLast && idx === lastIdx;
        return (
            <ArrivalNote
                deck={deck}
                note={note}
                renderDivider={renderDivider}
            />
        );
    });

    return <div class="c-view-passage-within-back-deck">{notes}</div>;
}

type ArrivalNoteProps = {
    deck: FatDeck;
    note: Note;
    renderDivider: boolean;
};

function ArrivalNote({ deck, note, renderDivider }: ArrivalNoteProps) {
    const [flashcardIndicators, maximisedFlashcards] = useFlashcards(
        note.flashcards,
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

    if (!linkingRef) {
        console.error(`Deck not a ref in Arrival ???? id:${deck.id}???`);
        return <div></div>;
    }

    let annotation = linkingRef.annotation;

    return (
        <div>
            {annotation && buildTopAnnotation(annotation!)}
            <CivContainer>
                <CivLeft>
                    <ViewSelfReference
                        reference={linkingRef}
                        extraClasses="left-margin-entry"
                    />
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
                    {renderDivider && <hr />}
                </CivMain>
            </CivContainer>
        </div>
    );
}
