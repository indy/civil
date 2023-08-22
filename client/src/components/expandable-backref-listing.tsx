import { h } from "preact";

import { BackRefNote, Reference, SlimDeck, RenderingDeckPart } from "types";

import { fontClass } from "shared/font";

import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import RefView from "components/ref-view";
import buildMarkup from "components/build-markup";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

type ExpandableBackRefListingProps = {
    slimDeck: SlimDeck;
    deckLevelRefs: Array<Reference>;
    deckLevelAnnotation?: string;
    backRefNoteSeqs: Array<Array<BackRefNote>>;
};

export default function ExpandableBackRefListing({
    slimDeck,
    deckLevelRefs,
    deckLevelAnnotation,
    backRefNoteSeqs,
}: ExpandableBackRefListingProps) {
    let heading = (
        <span class="font-size-1-point-6">
            <DeckLink slimDeck={slimDeck} />
        </span>
    );

    return (
        <Expandable heading={heading}>
            {deckLevelAnnotation &&
                buildDeckLevelAnnotation(deckLevelAnnotation)}
            {buildDeckLevelBackRefs(deckLevelRefs)}
            {buildNoteSeqs(backRefNoteSeqs)}
        </Expandable>
    );
}

function buildDeckLevelAnnotation(deckLevelAnnotation: string) {
    return (
        <CivContainer>
            <CivMain>
                <div class="ref-top-scribble indented">
                    {deckLevelAnnotation}
                </div>
            </CivMain>
        </CivContainer>
    );
}

function buildDeckLevelBackRefs(deckLevelRefs: Array<Reference>) {
    let refs = deckLevelRefs.map((ref) => (
        <RefView reference={ref} extraClasses="deck-level-backref" />
    ));

    return (
        <CivContainer>
            <CivMain>
                <div>{refs}</div>{" "}
            </CivMain>
        </CivContainer>
    );
}

function buildNotes(notes: Array<BackRefNote>) {
    let ini: Array<preact.JSX.Element> = [];

    let res = notes.reduce((a, note) => {
        if (note.topAnnotation !== null) {
            a.push(
                <CivContainer>
                    <CivMain>
                        <div class="ref-top-scribble">{note.topAnnotation}</div>
                    </CivMain>
                </CivContainer>
            );
        }
        let refs =
            note.refs &&
            note.refs.map((r) => {
                return (
                    <RefView reference={r} extraClasses="left-margin-entry" />
                );
            });

        let klass = fontClass(note.font, RenderingDeckPart.Body);
        klass += " note";

        a.push(
            <CivContainer extraClasses={klass}>
                {note.refs && <CivLeft>{refs}</CivLeft>}
                <CivMain>
                    {buildMarkup(note.noteContent, note.font, note.noteId)}
                </CivMain>
            </CivContainer>
        );
        return a;
    }, ini);

    return <div>{res}</div>;
}

function buildNoteSeqs(backRefNoteSeqs: Array<Array<BackRefNote>>) {
    let ini: Array<preact.JSX.Element> = [];

    let res = backRefNoteSeqs
        .reduce((a, noteSeq) => {
            a.push(buildNotes(noteSeq));
            a.push(
                <CivContainer>
                    <CivMain>
                        <hr />
                    </CivMain>
                </CivContainer>
            );
            return a;
        }, ini)
        .slice(0, -1); // the slice removes the final hr tag

    return <div>{res}</div>;
}
