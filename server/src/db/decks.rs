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
use crate::db::sqlite::{self, FromRow};
use crate::db::{db, DbError, SqlitePool};
use crate::interop::decks as interop;
use crate::interop::font::Font;
use crate::interop::Key;
use rusqlite::{params, Connection, Row};

#[allow(unused_imports)]
use tracing::{info, warn};

pub(crate) const DECKBASE_QUERY: &str =
    "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
     FROM decks
     WHERE user_id = ?1 AND id = ?2 AND kind = ?3";

pub(crate) enum DeckBaseOrigin {
    Created,
    PreExisting,
}

#[derive(Debug, Clone)]
pub struct DeckBase {
    pub id: Key,
    pub title: String,
    pub deck_kind: interop::DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,
}

impl FromRow for interop::SlimDeck {
    fn from_row(row: &Row) -> rusqlite::Result<interop::SlimDeck> {
        Ok(interop::SlimDeck {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,
        })
    }
}

impl FromRow for DeckBase {
    fn from_row(row: &Row) -> rusqlite::Result<DeckBase> {
        Ok(DeckBase {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,
        })
    }
}

impl FromRow for interop::Hit {
    fn from_row(row: &Row) -> rusqlite::Result<interop::Hit> {
        Ok(interop::Hit {
            created_at: row.get(0)?,
        })
    }
}

impl FromRow for Font {
    fn from_row(row: &Row) -> rusqlite::Result<Font> {
        let font = row.get(0)?;
        Ok(font)
    }
}

fn recently_visited_any_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    num: i32,
) -> Result<Vec<interop::SlimDeck>, DbError> {
    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at, decks.graph_terminator, decks.insignia, decks.font, decks.impact, max(hits.created_at) as most_recent_visit
                FROM hits INNER JOIN decks ON decks.id = hits.deck_id
                WHERE decks.user_id = ?1
                GROUP BY hits.deck_id
                ORDER BY most_recent_visit DESC
                LIMIT ?2";

    sqlite::many(&conn, stmt, params![&user_id, &num])
}

pub(crate) async fn recently_visited_any(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    num: i32,
) -> crate::Result<Vec<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        recently_visited_any_conn(conn, user_id, num)
    })
    .await
}

pub fn recently_visited_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: interop::DeckKind,
    num: i32,
) -> Result<Vec<interop::SlimDeck>, DbError> {
    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at, decks.graph_terminator, decks.insignia, decks.font, decks.impact, max(hits.created_at) as most_recent_visit
                FROM hits INNER JOIN decks ON decks.id = hits.deck_id
                WHERE decks.user_id = ?1 AND decks.kind=?2
                GROUP BY hits.deck_id
                ORDER BY most_recent_visit DESC
                LIMIT ?3";

    sqlite::many(&conn, stmt, params![&user_id, &deck_kind.to_string(), &num])
}

pub(crate) async fn recently_visited(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
    num: i32,
) -> crate::Result<Vec<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        recently_visited_conn(conn, user_id, deck_kind, num)
    })
    .await
}

fn num_decks_for_deck_kind(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: interop::DeckKind,
) -> Result<i32, DbError> {
    let stmt = "SELECT count(*) FROM decks where user_id=?1 AND kind=?2;";

    sqlite::one(&conn, stmt, params![user_id, &deck_kind.to_string()])
}

fn pagination_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: interop::DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<interop::Pagination<interop::SlimDeck>, DbError> {
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = ?2
                ORDER BY created_at DESC
                LIMIT ?3
                OFFSET ?4";

    let items = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &deck_kind.to_string(), &num_items, &offset],
    )?;

    let total_items = num_decks_for_deck_kind(conn, user_id, deck_kind)?;

    let res = interop::Pagination::<interop::SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) async fn pagination(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<interop::Pagination<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        pagination_conn(conn, user_id, deck_kind, offset, num_items)
    })
    .await
}

fn pagination_events_chronologically_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: interop::DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<interop::Pagination<interop::SlimDeck>, DbError> {
    let stmt = "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact
                FROM decks as d LEFT JOIN points AS p ON p.deck_id = d.id
                WHERE d.user_id = ?1 AND d.kind = ?2
                ORDER BY (p.exact_realdate IS NOT NULL OR p.lower_realdate IS NOT NULL OR p.upper_realdate IS NOT NULL),
                COALESCE(p.exact_realdate, p.lower_realdate, p.upper_realdate) DESC
                LIMIT ?3
                OFFSET ?4";

    let items = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &deck_kind.to_string(), &num_items, &offset],
    )?;

    let total_items = num_decks_for_deck_kind(conn, user_id, deck_kind)?;

    let res = interop::Pagination::<interop::SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) async fn pagination_events_chronologically(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<interop::Pagination<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        pagination_events_chronologically_conn(conn, user_id, deck_kind, offset, num_items)
    })
    .await
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
    graph_terminator: bool,
    insignia: i32,
    font: Font,
    impact: i32,
) -> Result<(DeckBase, DeckBaseOrigin), DbError> {
    let existing_deck_res = deckbase_get_by_name(tx, user_id, kind, name);
    match existing_deck_res {
        Ok(deck) => Ok((deck, DeckBaseOrigin::PreExisting)),
        Err(e) => match e {
            DbError::NotFound => {
                let deck = deckbase_create(
                    tx,
                    user_id,
                    kind,
                    name,
                    graph_terminator,
                    insignia,
                    font,
                    impact,
                )?;
                Ok((deck, DeckBaseOrigin::Created))
            }
            _ => Err(e),
        },
    }
}

pub(crate) fn hit(conn: &Connection, deck_id: Key) -> Result<(), DbError> {
    let stmt = "INSERT INTO hits(deck_id) VALUES (?1)";
    sqlite::zero(conn, stmt, params![&deck_id])
}

fn get_hits_conn(conn: &rusqlite::Connection, deck_id: Key) -> Result<Vec<interop::Hit>, DbError> {
    let stmt = "SELECT created_at FROM hits WHERE deck_id = ?1 ORDER BY created_at DESC;";
    sqlite::many(&conn, stmt, params![&deck_id])
}

pub(crate) async fn get_hits(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<interop::Hit>> {
    db(sqlite_pool, move |conn| get_hits_conn(conn, deck_id)).await
}

fn deckbase_get_by_name(
    conn: &Connection,
    user_id: Key,
    kind: interop::DeckKind,
    name: &str,
) -> Result<DeckBase, DbError> {
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM DECKS
                WHERE user_id = ?1 AND name = ?2 AND kind = ?3";
    sqlite::one(conn, stmt, params![&user_id, &name, &kind.to_string()])
}

pub(crate) fn deckbase_create(
    tx: &Connection,
    user_id: Key,
    kind: interop::DeckKind,
    name: &str,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
    impact: i32,
) -> Result<DeckBase, DbError> {
    let stmt = "INSERT INTO decks(user_id, kind, name, graph_terminator, insignia, font, impact)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                RETURNING id, name, kind, created_at, graph_terminator, insignia, font, impact";

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
            impact
        ],
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
    impact: i32,
) -> Result<DeckBase, DbError> {
    // if the font has changed
    let original_font = get_font_of_deck(tx, deck_id)?;

    if original_font != font {
        // change all of this deck's notes that have the old font to the new font
        notes::replace_note_fonts_conn(tx, user_id, deck_id, original_font, font)?;
    }

    let stmt = "UPDATE decks
                SET name = ?4, graph_terminator = ?5, insignia = ?6, font = ?7, impact = ?8
                WHERE user_id = ?1 AND id = ?2 AND kind = ?3
                RETURNING id, name, kind, created_at, graph_terminator, insignia, font, impact";
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
            &i32::from(font),
            impact
        ],
    )
}

fn insignia_filter_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: interop::DeckKind,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> Result<interop::Pagination<interop::SlimDeck>, DbError> {
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND insignia & ?2 AND kind = ?3
                ORDER BY created_at DESC
                LIMIT ?4
                OFFSET ?5";

    let items = sqlite::many(
        &conn,
        stmt,
        params![
            &user_id,
            &insignia,
            &deck_kind.to_string(),
            &num_items,
            &offset
        ],
    )?;

    let stmt = "SELECT count(*) FROM decks where user_id=?1 AND insignia & ?2 AND kind=?3;";
    let total_items = sqlite::one(
        &conn,
        stmt,
        params![user_id, &insignia, &deck_kind.to_string()],
    )?;

    let res = interop::Pagination::<interop::SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) async fn insignia_filter(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> crate::Result<interop::Pagination<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        insignia_filter_conn(conn, user_id, deck_kind, insignia, offset, num_items)
    })
    .await
}

fn insignia_filter_any_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> Result<interop::Pagination<interop::SlimDeck>, DbError> {
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND insignia & ?2
                ORDER BY created_at DESC
                LIMIT ?3
                OFFSET ?4";

    let items = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &insignia, &num_items, &offset],
    )?;

    let stmt = "SELECT count(*) FROM decks where user_id=?1 AND insignia & ?2;";
    let total_items = sqlite::one(&conn, stmt, params![user_id, &insignia])?;

    let res = interop::Pagination::<interop::SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) async fn insignia_filter_any(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> crate::Result<interop::Pagination<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        insignia_filter_any_conn(conn, user_id, insignia, offset, num_items)
    })
    .await
}

fn recent_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: interop::DeckKind,
) -> Result<Vec<interop::SlimDeck>, DbError> {
    let limit: i32 = 10;

    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = '$deck_kind'
                ORDER BY created_at DESC
                LIMIT $limit";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    sqlite::many(&conn, &stmt, params![&user_id])
}

pub(crate) async fn recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_kind: interop::DeckKind,
) -> crate::Result<Vec<interop::SlimDeck>> {
    db(sqlite_pool, move |conn| {
        recent_conn(conn, user_id, deck_kind)
    })
    .await
}

// delete anything that's represented as a deck (article, person, idea, timeline, quote, dialogue)
//
fn delete_conn(conn: &Connection, user_id: Key, id: Key) -> Result<(), DbError> {
    sqlite::zero(
        &conn,
        "DELETE FROM decks WHERE id = ?2 and user_id = ?1",
        params![&user_id, &id],
    )?;

    Ok(())
}

pub(crate) async fn delete(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| delete_conn(conn, user_id, deck_id)).await
}

fn get_font_of_deck(conn: &Connection, deck_id: Key) -> Result<Font, DbError> {
    sqlite::one(
        conn,
        "SELECT font FROM decks WHERE id = ?1",
        params![&deck_id],
    )
}

pub(crate) fn overwrite_deck_font(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    new_font: Font,
) -> Result<(), DbError> {
    sqlite::zero(
        conn,
        "UPDATE decks
         SET font = ?3
         WHERE user_id = ?1 AND id = ?2 AND font <> ?3",
        params![&user_id, &deck_id, &i32::from(new_font)],
    )
}
