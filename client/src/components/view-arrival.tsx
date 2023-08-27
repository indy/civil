import { h } from "preact";

import { FatDeck, Arrival, Note, Passage, Reference } from "types";

import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import buildMarkup from "components/build-markup";
import ViewReference from "components/view-reference";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

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
    function buildRef(ref: Reference) {
        return (
            <ViewReference reference={ref} extraClasses="left-margin-entry" />
        );
    }

    function buildNote(n: Note, idx: number) {
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

        // this note will contain only one ref to the destination deck
        // so display any annotation that ref might have
        //
        let linkingRef = n.refs.find((r) => {
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
                        {n.refs
                            .filter((r) => {
                                return r.id !== deck.id;
                            })
                            .map(buildRef)}
                    </CivLeft>
                    <CivMain>
                        {buildMarkup(n.content, n.font, n.id)}
                        {idx < passage.length - 1 && <hr />}
                    </CivMain>
                </CivContainer>
            </div>
        );
    }

    return (
        <div class="c-view-passage-within-back-deck">
            {passage.map(buildNote)}
        </div>
    );
}
