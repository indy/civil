import { h } from "preact";

import { NoteThing, Reference, SlimDeck } from "types";

import { svgCaretRight, svgCaretDown } from "components/svg-icons";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import DeckLink from "components/deck-link";
import RefView from "components/ref-view";
import buildMarkup from "components/notes/build-markup";

type ListingLinkProps = {
    slimDeck: SlimDeck;
};

function ListingLink({ slimDeck }: ListingLinkProps) {
    let res = (
        <li class="listing-link">
            <DeckLink slimDeck={slimDeck} />
        </li>
    );

    return res;
}

type ExpandableListingLinkProps = {
    index: number;
    slimDeck: SlimDeck;
    deckLevelRefs: Array<Reference>;
    deckLevelAnnotation?: string;
    notes: Array<NoteThing>;
    expanded: boolean;
    onExpandClick: (key: number) => void;
};

function ExpandableListingLink({
    index,
    slimDeck,
    deckLevelRefs,
    deckLevelAnnotation,
    notes,
    expanded,
    onExpandClick,
}: ExpandableListingLinkProps) {
    function onClicked(e: Event) {
        e.preventDefault();
        onExpandClick(index);
    }

    let icon = expanded ? svgCaretDown() : svgCaretRight();

    let res = (
        <div>
            <CivContainer>
                <CivMain>
                    <span onClick={onClicked}>{icon}</span>
                    <span class="backref-deck">
                        <DeckLink slimDeck={slimDeck} />
                    </span>
                </CivMain>
            </CivContainer>

            {expanded &&
                deckLevelAnnotation &&
                buildDeckLevelAnnotation(deckLevelAnnotation)}
            {expanded && buildDeckLevelBackRefs(deckLevelRefs)}
            {expanded && buildNotes(notes)}
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

function buildNotes(notes: Array<NoteThing>) {
    let ini: Array<preact.JSX.Element> = [];

    let res = notes
        .reduce((a, note) => {
            if (note.topAnnotation !== undefined) {
                a.push(
                    <CivContainer>
                        <CivMain>
                            <div class="ref-top-scribble">
                                {note.topAnnotation}
                            </div>
                        </CivMain>
                    </CivContainer>
                );
            }
            let refs =
                note.refs &&
                note.refs.map((r) => {
                    return <RefView reference={r} extraClasses="left-margin-entry" />;
                });

            a.push(
                <CivContainer extraClasses="note">
                    {note.refs && <CivLeft>{refs}</CivLeft>}
                    <CivMain>{buildMarkup(note.noteContent)}</CivMain>
                </CivContainer>
            );

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

export { ListingLink, ExpandableListingLink };
