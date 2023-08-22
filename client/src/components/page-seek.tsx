import { h } from "preact";
import { useState } from "preact/hooks";

import { Reference, SeekNote, SeekDeck, SeekResults } from "types";

import Net from "shared/net";
import { sanitize } from "shared/search";

import RefView from "components/ref-view";
import TopBarMenu from "components/top-bar-menu";
import CivilInput from "components/civil-input";
import buildMarkup from "components/build-markup";
import DeckLink from "components/deck-link";
import Expandable from "components/expandable";
import {
    CivContainer,
    CivLeft,
    CivMainUi,
    CivMain,
} from "components/civil-layout";

export default function Seek({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SeekModule />
        </div>
    );
}

type SeekPage = {
    query: string;
    seekDecks: Array<SeekDeck>;
};

function buildSeekPage(query: string, response: Array<SeekDeck>): SeekPage {
    const seekPage: SeekPage = {
        query,
        seekDecks: response,
    };

    return seekPage;
}

function SeekModule() {
    const [seekPage, setSeekPage] = useState({ query: "", seekDecks: [] } as SeekPage);

    function onReturnPressed(content: string) {
        let sanitized: string = sanitize(content);
        if (sanitized.length > 0) {
            const url = `/api/notes/seek?q=${encodeURI(sanitized)}`;
            Net.get<SeekResults>(url).then((response) => {
                setSeekPage(buildSeekPage(content, response.results));
            });
        }
    }

    // can't use a module since seek will end up rendering user content
    //
    return (
        <article class="c-seek-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Seek</h3>
                </CivLeft>
                <CivMainUi>
                    <CivilInput onReturnPressed={onReturnPressed} />
                </CivMainUi>
            </CivContainer>
            <RenderSeekPage seekPage={seekPage} />
        </article>
    );
}

function RenderSeekPage({ seekPage }: { seekPage: SeekPage }) {
    const seekDecks = seekPage.seekDecks.map((seekDeck) => <RenderSeekDeck seekDeck={seekDeck} />);

    return <div class="c-render-seek-page">{seekDecks}</div>;
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
            <CivMain>
                {buildMarkup(note.content, note.font, note.id)}
            </CivMain>
        </CivContainer>
    );
}
