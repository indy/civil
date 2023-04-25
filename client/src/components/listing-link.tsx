import { h } from "preact";

import { NoteThing, Ref, SlimDeck } from "types";

import { svgCaretRight, svgCaretDown } from "components/svg-icons";

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
    deckLevelRefs: Array<Ref>;
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
            <span onClick={onClicked}>{icon}</span>
            <span class="backref-deck">
                <DeckLink slimDeck={slimDeck} />
            </span>
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
    return <div class="ref-top-scribble indented">{deckLevelAnnotation}</div>;
}

function buildDeckLevelBackRefs(deckLevelRefs: Array<Ref>) {
    let refs = deckLevelRefs.map((r) => (
        <RefView deckReference={r} extraClasses="deck-level-backref" />
    ));

    return <div>{refs}</div>;
}

function buildNotes(notes: Array<NoteThing>) {
    let ini: Array<preact.JSX.Element> = [];

    let res = notes
        .reduce((a, note) => {
            if (note.topAnnotation !== undefined) {
                a.push(
                    <div class="ref-top-scribble">{note.topAnnotation}</div>
                );
            }
            let refs =
                note.refs &&
                note.refs.map((r) => {
                    return (
                        <RefView
                            deckReference={r}
                            extraClasses="left-margin-entry"
                        />
                    );
                });

            a.push(
                <div class="note muh-container">
                    {note.refs && <div class="left-margin">{refs}</div>}
                    <div class="note-content muh-content">
                        {buildMarkup(note.noteContent)}
                    </div>
                </div>
            );

            a.push(<hr />);
            return a;
        }, ini)
        .slice(0, -1); // the slice removes the final hr tag

    return <div>{res}</div>;
}

export { ListingLink, ExpandableListingLink };
