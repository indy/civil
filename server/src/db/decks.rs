// Copyright (C) 2021 Inderjit Gill <email@indy.io>

// This file is part of Civil

// Civil is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Civil is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::db::notes;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::Error;
use crate::interop::decks as interop;
use crate::interop::font::Font;
use crate::interop::Key;
use rusqlite::{params, Connection, Row};

use std::str::FromStr;
#[allow(unused_imports)]
use tracing::{info, warn};

pub(crate) enum DeckBaseOrigin {
    Created,
    PreExisting,
}

#[derive(Debug, Clone)]
pub struct DeckBase {
    pub id: Key,
    pub title: String,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
}

fn deckbase_from_row(row: &Row) -> crate::Result<DeckBase> {
    Ok(DeckBase {
        id: row.get(0)?,
        title: row.get(1)?,
        created_at: row.get(2)?,
        graph_terminator: row.get(3)?,
        insignia: row.get(4)?,
        font: row.get(5)?,
    })
}

pub fn recently_visited(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    num: i32,
) -> crate::Result<Vec<interop::SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.insignia, decks.font, decks.graph_terminator, max(hits.created_at) as most_recent_visit
                FROM hits INNER JOIN decks ON decks.id = hits.deck_id
                WHERE decks.user_id = ?1
                GROUP BY hits.deck_id
                ORDER BY most_recent_visit DESC
                LIMIT ?2";

    sqlite::many(&conn, stmt, params![&user_id, &num], slimdeck_from_row)
}

fn num_decks_for_deck_kind(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
) -> crate::Result<i32> {
    let conn = sqlite_pool.get()?;
    let stmt = "SELECT count(*) FROM decks where user_id=?1 AND kind=?2;";

    sqlite::one(
        &conn,
        stmt,
        params![user_id, &deck_kind.to_string()],
        sqlite::i32_from_row,
    )
}

pub(crate) fn slimdeck_from_row(row: &Row) -> crate::Result<interop::SlimDeck> {
    let res: String = row.get(2)?;

    Ok(interop::SlimDeck {
        id: row.get(0)?,
        title: row.get(1)?,
        deck_kind: interop::DeckKind::from_str(&res)?,
        insignia: row.get(3)?,
        font: row.get(4)?,
        graph_terminator: row.get(5)?,
    })
}

pub(crate) const DECKBASE_QUERY: &str =
    "select id, name, created_at, graph_terminator, insignia, font
                                         from decks
                                         where user_id = ?1 and id = ?2 and kind = ?3";

pub(crate) fn pagination(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<interop::Pagination<interop::SlimDeck>> {
    let conn = sqlite_pool.get()?;

    // TODO: sort this by the event date in event_extras
    let stmt = "SELECT id, name, kind, insignia, font, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND kind = ?2
                ORDER BY created_at DESC
                LIMIT ?3
                OFFSET ?4";

    let items = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &deck_kind.to_string(), &num_items, &offset],
        slimdeck_from_row,
    )?;

    let total_items = num_decks_for_deck_kind(sqlite_pool, user_id, deck_kind)?;

    let res = interop::Pagination::<interop::SlimDeck> { items, total_items };

    Ok(res)
}

// note: may execute multiple sql write statements so should be in a transaction
//
// returns tuple where the second element is a bool indicating whether the deck
// was created (true) or we're returning a pre-existing deck (false)
//
pub(crate) fn deckbase_get_or_create(
    tx: &Connection,
    user_id: Key,
    kind: interop::DeckKind,
    name: &str,
    font: Font,
) -> crate::Result<(DeckBase, DeckBaseOrigin)> {
    let existing_deck_res = deckbase_get_by_name(tx, user_id, kind, name);
    match existing_deck_res {
        Ok(deck) => Ok((deck, DeckBaseOrigin::PreExisting)),
        Err(e) => match e {
            Error::NotFound => {
                let deck = deckbase_create(tx, user_id, kind, name, font)?;
                Ok((deck, DeckBaseOrigin::Created))
            }
            _ => Err(e),
        },
    }
}

pub(crate) fn hit(conn: &Connection, deck_id: Key) -> crate::Result<()> {
    let stmt = "INSERT INTO hits(deck_id) VALUES (?1)";
    sqlite::zero(conn, stmt, params![&deck_id])
}

pub(crate) fn get_hits(sqlite_pool: &SqlitePool, deck_id: Key) -> crate::Result<Vec<interop::Hit>> {
    fn hit_from_row(row: &Row) -> crate::Result<interop::Hit> {
        Ok(interop::Hit {
            created_at: row.get(0)?,
        })
    }

    let conn = sqlite_pool.get()?;
    let stmt = "SELECT created_at FROM hits WHERE deck_id = ?1 ORDER BY created_at DESC;";
    sqlite::many(&conn, stmt, params![&deck_id], hit_from_row)
}

fn deckbase_get_by_name(
    conn: &Connection,
    user_id: Key,
    kind: interop::DeckKind,
    name: &str,
) -> crate::Result<DeckBase> {
    let stmt = "SELECT id, name, created_at, graph_terminator, insignia, font
                FROM DECKS
                WHERE user_id = ?1 AND name = ?2 AND kind = ?3";
    sqlite::one(
        conn,
        stmt,
        params![&user_id, &name, &kind.to_string()],
        deckbase_from_row,
    )
}

// note: will execute multiple sql write statements so should be in a transaction
//
pub(crate) fn deckbase_create(
    tx: &Connection,
    user_id: Key,
    kind: interop::DeckKind,
    name: &str,
    font: Font,
) -> crate::Result<DeckBase> {
    let graph_terminator = false;
    let stmt = "INSERT INTO decks(user_id, kind, name, graph_terminator, insignia, font)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                RETURNING id, name, created_at, graph_terminator, insignia, font";
    let insignia: i32 = 0;
    let deckbase: DeckBase = sqlite::one(
        tx,
        stmt,
        params![
            &user_id,
            &kind.to_string(),
            name,
            graph_terminator,
            &insignia,
            &i32::from(font),
        ],
        deckbase_from_row,
    )?;

    // create the mandatory NoteKind::NoteDeckMeta
    let _note = notes::create_note_deck_meta(tx, user_id, deckbase.id)?;

    Ok(deckbase)
}

pub(crate) fn deckbase_edit(
    tx: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: interop::DeckKind,
    name: &str,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
) -> crate::Result<DeckBase> {
    // if the font has changed
    let original_font = get_font_of_deck(tx, deck_id)?;

    if original_font != font {
        // change all of this deck's notes that have the old font to the new font
        notes::replace_note_fonts(tx, user_id, deck_id, original_font, font)?;
    }

    let stmt = "UPDATE decks
                SET name = ?4, graph_terminator = ?5, insignia = ?6, font = ?7
                WHERE user_id = ?1 AND id = ?2 AND kind = ?3
                RETURNING id, name, created_at, graph_terminator, insignia, font";
    sqlite::one(
        tx,
        stmt,
        params![
            &user_id,
            &deck_id,
            &kind.to_string(),
            name,
            graph_terminator,
            insignia,
            &i32::from(font)
        ],
        deckbase_from_row,
    )
}

pub(crate) fn get_slimdeck(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<interop::SlimDeck> {
    let stmt = "SELECT id, name, kind, insignia, font, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND id = ?2";

    sqlite::one(conn, stmt, params![&user_id, &deck_id], slimdeck_from_row)
}

pub(crate) fn insignia_filter(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> crate::Result<interop::Pagination<interop::SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, kind, insignia, font, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND insignia & ?2
                ORDER BY created_at DESC
                LIMIT ?3
                OFFSET ?4";

    let items = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &insignia, &num_items, &offset],
        slimdeck_from_row,
    )?;

    let stmt = "SELECT count(*) FROM decks where user_id=?1 AND insignia & ?2;";
    let total_items = sqlite::one(
        &conn,
        stmt,
        params![user_id, &insignia],
        sqlite::i32_from_row,
    )?;

    let res = interop::Pagination::<interop::SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
) -> crate::Result<Vec<interop::SlimDeck>> {
    let conn = sqlite_pool.get()?;
    let limit: i32 = 10;

    let stmt = "SELECT id, name, kind, insignia, font, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND kind = '$deck_kind'
                ORDER BY created_at DESC
                LIMIT $limit";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    sqlite::many(&conn, &stmt, params![&user_id], slimdeck_from_row)
}

// delete anything that's represented as a deck (article, person, idea, timeline, quote, dialogue)
//
pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, id: Key) -> crate::Result<()> {
    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "DELETE FROM decks WHERE id = ?2 and user_id = ?1",
        params![&user_id, &id],
    )?;

    Ok(())
}

/*
// return all notes that have references back to the currently displayed deck
//
pub(crate) fn get_backnotes(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<note_interop::XXXBackNote>> {
    let conn = sqlite_pool.get()?;

    fn backnote_from_row(row: &Row) -> crate::Result<note_interop::XXXBackNote> {
        let kind: String = row.get(2)?;
        let sql_note_kind: i32 = row.get(5)?;

        let note_fnt: i32 = row.get(8)?;
        let fnt: i32 = row.get(9)?;

        Ok(note_interop::XXXBackNote {
            note_id: row.get(4)?,
            prev_note_id: row.get(7)?,
            note_content: row.get(3)?,
            note_kind: note_interop::NoteKind::try_from(sql_note_kind)?,
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: interop::DeckKind::from_str(&kind)?,
            insignia: row.get(6)?,
            note_font: Font::try_from(note_fnt)?,
            font: Font::try_from(fnt)?,
            graph_terminator: row.get(10)?,
        })
    }

    let stmt = "SELECT d.id AS deck_id,
                       d.name AS deck_name,
                       d.kind as kind,
                       n.content as note_content,
                       n.id as note_id,
                       n.kind as note_kind,
                       d.insignia,
                       n.prev_note_id as prev_note_id,
                       n.font as note_font,
                       d.font,
                       d.graph_terminator
                FROM decks d,
                     notes n,
                     notes_decks nd
                WHERE n.deck_id = d.id
                      AND nd.note_id = n.id
                      AND nd.deck_id = ?1
                ORDER BY d.name, n.id";
    sqlite::many(&conn, stmt, params![&deck_id], backnote_from_row)
}
*/

fn get_font_of_deck(conn: &Connection, deck_id: Key) -> crate::Result<Font> {
    fn font_from_row(row: &Row) -> crate::Result<Font> {
        let font = row.get(0)?;
        Ok(font)
    }

    sqlite::one(
        conn,
        "select font from decks where id = ?1",
        params![&deck_id],
        font_from_row,
    )
}

pub(crate) fn overwrite_deck_font(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    new_font: Font,
) -> crate::Result<()> {
    let stmt = "UPDATE decks
                SET font = ?3
                WHERE user_id = ?1 AND id = ?2 AND font <> ?3";

    sqlite::zero(
        conn,
        stmt,
        params![&user_id, &deck_id, &i32::from(new_font)],
    )
}
