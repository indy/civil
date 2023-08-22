import { h } from "preact";
import { useState } from "preact/hooks";

import { Key, SeekNote, SeekResults, NoteKind, Font, SlimDeck } from "types";

import Net from "shared/net";
import { sanitize } from "shared/search";

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

type SeekNoteEntry = {
    id: Key;
    prevNoteId?: Key;
    kind: NoteKind;
    content: string;
    pointId?: Key;
    font: Font;

    rank: number;
};

type SeekDeck = {
    deck: SlimDeck;
    notes: Array<SeekNoteEntry>;
};

type SeekPage = {
    query: string;
    decks: Array<SeekDeck>;
};

// crappy, slow implementation
//
function buildSeekPage(query: string, response: Array<SeekNote>): SeekPage {
    function buildSeekNoteEntry(seekNote: SeekNote): SeekNoteEntry {
        return {
            id: seekNote.id,
            prevNoteId: seekNote.prevNoteId,
            kind: seekNote.kind,
            content: seekNote.content,
            pointId: seekNote.pointId,
            font: seekNote.font,
            rank: seekNote.rank,
        };
    }

    function buildSlimDeck(seekNote: SeekNote): SlimDeck {
        return {
            id: seekNote.deckId,
            title: seekNote.deckTitle,
            deckKind: seekNote.deckKind,
            graphTerminator: seekNote.deckGraphTerminator,
            insignia: seekNote.deckInsignia,
            font: seekNote.deckFont,
        };
    }

    function buildSeekDeck(seekNote: SeekNote): SeekDeck {
        return {
            deck: buildSlimDeck(seekNote),
            notes: [],
        };
    }

    let decks: Array<SeekDeck> = [];
    response.forEach((r) => {
        let di = decks.findIndex((d) => d.deck.id === r.deckId);
        if (di === -1) {
            decks.push(buildSeekDeck(r));
            di = decks.length - 1;
        }
        decks[di].notes.push(buildSeekNoteEntry(r));
    });

    const seekPage: SeekPage = {
        query,
        decks,
    };

    return seekPage;
}

function SeekModule() {
    const [page, setPage] = useState({ query: "", decks: [] } as SeekPage);

    function onReturnPressed(content: string) {
        let sanitized: string = sanitize(content);
        if (sanitized.length > 0) {
            const url = `/api/notes/seek?q=${encodeURI(sanitized)}`;
            Net.get<SeekResults>(url).then((response) => {
                setPage(buildSeekPage(content, response.results));
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
            <RenderSeekPage page={page} />
        </article>
    );
}

function RenderSeekPage({ page }: { page: SeekPage }) {
    const seekDecks = page.decks.map((deck) => <RenderSeekDeck deck={deck} />);

    return <div class="c-render-seek-page">{seekDecks}</div>;
}

function RenderSeekDeck({ deck }: { deck: SeekDeck }) {
    const seekNoteEntries = deck.notes.map((note) => (
        <RenderSeekNoteEntry note={note} />
    ));

    let heading = (
        <span class="font-size-1-point-6">
            <DeckLink slimDeck={deck.deck} />
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

function RenderSeekNoteEntry({ note }: { note: SeekNoteEntry }) {
    return (
        <CivContainer extraClasses="c-render-seek-note-entry note">
            <CivMain>{buildMarkup(note.content, note.font, note.id)}</CivMain>
        </CivContainer>
    );
}
