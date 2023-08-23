import { h } from "preact";

import { Reference, SeekNote, SeekDeck } from "types";
import buildMarkup from "components/build-markup";
import RefView from "components/ref-view";
import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import { CivContainer, CivLeft, CivMain } from "components/civil-layout";

export default function CivilSeekResults({
    seekResults,
}: {
    seekResults: Array<SeekDeck>;
}) {
    const seekDecks = seekResults.map((seekDeck) => (
        <RenderSeekDeck seekDeck={seekDeck} />
    ));

    return <div class="c-civil-seek-results">{seekDecks}</div>;
}

function RenderSeekDeck({ seekDeck }: { seekDeck: SeekDeck }) {
    const seekNoteEntries = seekDeck.seekNotes.map((seekNote) => (
        <RenderSeekNote seekNote={seekNote} />
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

function RenderSeekNote({ seekNote }: { seekNote: SeekNote }) {
    function buildRefs(refs: Array<Reference>) {
        return refs.map((ref) => (
            <RefView reference={ref} extraClasses="left-margin-entry" />
        ));
    }

    const note = seekNote.note;

    return (
        <CivContainer extraClasses="c-render-seek-note-entry note">
            <CivLeft>{buildRefs(seekNote.refs)}</CivLeft>
            <CivMain>{buildMarkup(note.content, note.font, note.id)}</CivMain>
        </CivContainer>
    );
}
