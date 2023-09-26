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

use crate::db::decks;
use crate::db::sqlite::{self, FromRow, SqlitePool};
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::timelines::{ProtoTimeline, Timeline};
use crate::interop::Key;

use rusqlite::{params, Row};

impl FromRow for Timeline {
    fn from_row(row: &Row) -> crate::Result<Timeline> {
        Ok(Timeline {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,
            points: vec![],
            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> crate::Result<Timeline> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Timeline, title, Font::DeWalpergens)?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = 'timeline'
                ORDER BY created_at DESC";

    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline_id: Key,
) -> crate::Result<Timeline> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(
        &conn,
        decks::DECKBASE_QUERY,
        params![&user_id, &timeline_id, &DeckKind::Timeline.to_string()],
    )?;

    decks::hit(&conn, timeline_id)?;

    Ok(deck)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline: &ProtoTimeline,
    timeline_id: Key,
) -> crate::Result<Timeline> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        timeline_id,
        DeckKind::Timeline,
        &timeline.title,
        graph_terminator,
        timeline.insignia,
        timeline.font,
    )?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn delete(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline_id: Key,
) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, timeline_id)
}
