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
use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::decks::DeckKind;
use crate::interop::timelines as interop;
use crate::interop::Key;

use rusqlite::{params, Row};

fn from_row(row: &Row) -> Result<interop::Timeline> {
    Ok(interop::Timeline {
        id: row.get(0)?,
        title: row.get(1)?,
        points: None,
        notes: None,
        refs: None,
        backnotes: None,
        backrefs: None,
        flashcards: None,
    })
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> Result<interop::Timeline> {
    let conn = sqlite_pool.get()?;

    let (deck, _origin) =
        decks::deckbase_get_or_create(&conn, user_id, DeckKind::Timeline, &title)?;

    Ok(deck.into())
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Timeline>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "select id, name
                  from decks
                  where user_id = ?1 and kind = 'timeline'
                  order by created_at desc",
        params![&user_id],
        from_row,
    )
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline_id: Key,
) -> Result<interop::Timeline> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(
        &conn,
        decks::DECKBASE_QUERY,
        params![&user_id, &timeline_id, &DeckKind::Timeline.to_string()],
        from_row,
    )?;

    decks::hit(&conn, timeline_id)?;

    Ok(deck.into())
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline: &interop::ProtoTimeline,
    timeline_id: Key,
) -> Result<interop::Timeline> {
    let conn = sqlite_pool.get()?;

    let graph_terminator = false;
    let deck = decks::deckbase_edit(
        &conn,
        user_id,
        timeline_id,
        DeckKind::Timeline,
        &timeline.title,
        graph_terminator,
    )?;

    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, timeline_id: Key) -> Result<()> {
    decks::delete(sqlite_pool, user_id, timeline_id)
}
