import { h } from "preact";
import { useState } from "preact/hooks";

import { Key, SeekNote, SeekResults, NoteKind, Font, SlimDeck } from "types";

import TopBarMenu from "components/top-bar-menu";
import { Module } from "components/module";
import CivilInput from "components/civil-input";
import Net from "shared/net";
import buildMarkup from "components/build-markup";
import DeckLink from "components/deck-link";

export default function Seek({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SeekModule />
        </div>
    );
}

function sanitize(text: string) {
    let blocked = [
        "?",
        ">",
        "<",
        "+",
        "-",
        "/",
        "*",
        "%",
        "!",
        "(",
        ")",
        ",",
        ".",
        ":",
        "`",
        "\\",
        "'",
    ];
    return blocked.reduce((a, b) => a.replaceAll(b, ""), text);
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

// crappy, slow implementation
//
function buildSeekPage(query: string, response: Array<SeekNote>): SeekPage {
    let decks: Array<SeekDeck> = [];

    response.forEach((r) => {
        let di = decks.findIndex((d) => d.deck.id === r.deckId);
        if (di === -1) {
            // not found
            decks.push({
                deck: {
                    id: r.deckId,
                    title: r.deckTitle,
                    deckKind: r.deckKind,
                    graphTerminator: r.deckGraphTerminator,
                    insignia: r.deckInsignia,
                    font: r.deckFont,
                },
                notes: [buildSeekNoteEntry(r)],
            });
        } else {
            decks[di].notes.push(buildSeekNoteEntry(r));
        }
    });

    return {
        query,
        decks,
    };
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

    function renderSeekNoteEntry(entry: SeekNoteEntry) {
        return <li>{buildMarkup(entry.content, entry.font, entry.id)}</li>;
    }

    function renderSeekDeck(r: SeekDeck) {
        return (
            <div>
                <DeckLink slimDeck={r.deck} />
                <ul>{r.notes.map(renderSeekNoteEntry)}</ul>
                <hr />
            </div>
        );
    }

    return (
        <Module
            extraClasses="c-seek-module"
            heading="Seek"
            extraHeadingClasses="hack-margin-top-minus-half"
        >
            <CivilInput onReturnPressed={onReturnPressed} />
            {page.decks.map(renderSeekDeck)}
        </Module>
    );
}
