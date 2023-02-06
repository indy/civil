import { h } from "preact";

import { svgCaretRight, svgCaretDown } from "../svgIcons";
import Ref from "./Ref";
import DeckLink from "./DeckLink";

import buildMarkup from "./BuildMarkup";

function ListingLink({ resource, id, name, insignia }) {
    const href = `/${resource}/${id}`;

    let res = (
        <li class="listing-link">
            <DeckLink
                resource={resource}
                href={href}
                insignia={insignia}
                name={name}
            />
        </li>
    );

    return res;
}

function ExpandableListingLink({
    index,
    resource,
    deckId,
    deckName,
    deckInsignia,
    deckLevelRefs,
    deckLevelAnnotation,
    notes,
    expanded,
    onExpandClick,
}: {
    index?: any;
    resource?: any;
    deckId?: any;
    deckName?: any;
    deckInsignia?: any;
    deckLevelRefs?: any;
    deckLevelAnnotation?: any;
    notes?: any;
    expanded?: any;
    onExpandClick?: any;
}) {
    function onClicked(e: Event) {
        e.preventDefault();
        onExpandClick(index);
    }

    const href = `/${resource}/${deckId}`;

    let icon = expanded ? svgCaretDown() : svgCaretRight();

    let res = (
        <div>
            <span onClick={onClicked}>{icon}</span>
            <span class="backref-deck">
                <DeckLink
                    resource={resource}
                    href={href}
                    insignia={deckInsignia}
                    name={deckName}
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

function buildDeckLevelAnnotation(deckLevelAnnotation?: any) {
    return <div class="ref-top-scribble indented">{deckLevelAnnotation}</div>;
}

function buildDeckLevelBackRefs(deckLevelRefs?: any) {
    let refs = deckLevelRefs.map((r) => (
        <Ref deckReference={r} extraClasses="deck-level-backref" />
    ));

    return <div>{refs}</div>;
}

function buildNotes(notes) {
    let res = notes
        .reduce((a, note) => {
            if (note.topAnnotation) {
                a.push(
                    <div class="ref-top-scribble">{note.topAnnotation}</div>
                );
            }
            let refs =
                note.refs &&
                note.refs.map((r) => {
                    return (
                        <Ref
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
        }, [])
        .slice(0, -1); // the slice removes the final hr tag

    return <div>{res}</div>;
}

export { ListingLink, ExpandableListingLink };
