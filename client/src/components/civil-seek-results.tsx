import { h } from "preact";

import { Note, Reference, SeekDeck } from "types";

import buildMarkup from "components/build-markup";
import { CivContainer, CivLeft, CivMain } from "components/civil-layout";
import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import ViewReference from "components/view-reference";

export default function CivilSeekResults({
    seekResults,
}: {
    seekResults: Array<SeekDeck>;
}) {
    const seekDecks = seekResults.map((seekDeck) => (
        <ViewSeekDeck seekDeck={seekDeck} />
    ));

    return <div class="c-civil-seek-results">{seekDecks}</div>;
}

function ViewSeekDeck({ seekDeck }: { seekDeck: SeekDeck }) {
    const seekNoteEntries = seekDeck.seekNotes.map((seekNote) => (
        <SeekNote seekNote={seekNote} />
    ));

    let heading = (
        <span class="font-size-1-point-6">
            <DeckLink slimDeck={seekDeck.deck} />
        </span>
    );

    return (
        <Expandable
            extraClasses="c-render-seek-deck margin-top-3"
            heading={heading}
        >
            {seekNoteEntries}
        </Expandable>
    );
}

function SeekNote({ seekNote }: { seekNote: Note }) {
    function buildRefs(refs: Array<Reference>) {
        return refs.map((ref) => (
            <ViewReference reference={ref} extraClasses="left-margin-entry" />
        ));
    }

    return (
        <CivContainer extraClasses="c-render-seek-note-entry note">
            <CivLeft>{buildRefs(seekNote.refs)}</CivLeft>
            <CivMain>
                {buildMarkup(seekNote.content, seekNote.font, seekNote.id)}
            </CivMain>
        </CivContainer>
    );
}
