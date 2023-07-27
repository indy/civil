import { h } from "preact";

import { BackRefNote, Reference, SlimDeck, RenderingDeckPart } from "types";

import { fontClass } from "shared/font";

import { svgCaretRight, svgCaretDown } from "components/svg-icons";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import DeckLink from "components/deck-link";
import RefView from "components/ref-view";
import buildMarkup from "components/build-markup";

type ExpandableBackRefListingProps = {
    index: number;
    slimDeck: SlimDeck;
    deckLevelRefs: Array<Reference>;
    deckLevelAnnotation?: string;
    backRefNoteSeqs: Array<Array<BackRefNote>>;
    expanded: boolean;
    onExpandClick: (key: number) => void;
};

export default function ExpandableBackRefListing({
    index,
    slimDeck,
    deckLevelRefs,
    deckLevelAnnotation,
    backRefNoteSeqs,
    expanded,
    onExpandClick,
}: ExpandableBackRefListingProps) {
    function onClicked(e: Event) {
        e.preventDefault();
        onExpandClick(index);
    }

    let icon = expanded ? svgCaretDown() : svgCaretRight();

    let klass = fontClass(slimDeck.font, RenderingDeckPart.UiInterleaved);
    klass += " backref-deck";

    let res = (
        <div>
            <CivContainer>
                <CivMain>
                    <span onClick={onClicked}>{icon}</span>
                    <span class={klass}>
                        <DeckLink slimDeck={slimDeck} />
                    </span>
                </CivMain>
            </CivContainer>

            {expanded &&
                deckLevelAnnotation &&
                buildDeckLevelAnnotation(deckLevelAnnotation)}
            {expanded && buildDeckLevelBackRefs(deckLevelRefs)}
            {expanded && buildNoteSeqs(backRefNoteSeqs)}
        </div>
    );

    return res;
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
