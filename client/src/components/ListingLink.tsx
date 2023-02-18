import { h } from "preact";

import { NoteThing, Ref, DeckKind } from "../types";

import { svgCaretRight, svgCaretDown } from "../svgIcons";

import DeckLink from "./DeckLink";
import RefView from "./RefView";
import buildMarkup from "./BuildMarkup";

type ListingLinkProps = {
    deckKind: DeckKind;
    id: number;
    title: string;
    insignia: number;
};

function ListingLink({ deckKind, id, title, insignia }: ListingLinkProps) {
    let res = (
        <li class="listing-link">
            <DeckLink
                deckKind={deckKind}
                id={id}
                insignia={insignia}
                title={title}
            />
        </li>
    );

    return res;
}

type ExpandableListingLinkProps = {
    index: number;
    deckKind: DeckKind;
    id: number;
    title: string;
    deckInsignia: number;
    deckLevelRefs: Array<Ref>;
    deckLevelAnnotation?: string;
    notes: Array<NoteThing>;
    expanded: boolean;
    onExpandClick: (key: number) => void;
};

function ExpandableListingLink({
    index,
    deckKind,
    id,
    title,
    deckInsignia,
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
                <DeckLink
                    deckKind={deckKind}
                    id={id}
                    insignia={deckInsignia}
                    title={title}
                />
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
                <div class="note">
                    {note.refs && <div class="left-margin">{refs}</div>}
                    {buildMarkup(note.noteContent)}
                </div>
            );

            a.push(<hr />);
            return a;
        }, ini)
        .slice(0, -1); // the slice removes the final hr tag

    return <div>{res}</div>;
}

export { ListingLink, ExpandableListingLink };
