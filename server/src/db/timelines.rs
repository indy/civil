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


use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::error::Result;
use crate::interop::timelines as interop;
use crate::interop::Key;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;


use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Row, params};
use crate::db::deck_kind::sqlite_string_from_deck_kind;


#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct TimelineDerived {
    id: Key,
    name: String,
}

impl From<TimelineDerived> for interop::Timeline {
    fn from(e: TimelineDerived) -> interop::Timeline {
        interop::Timeline {
            id: e.id,
            title: e.name,

            points: None,
            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

impl From<decks::DeckBase> for interop::Timeline {
    fn from(e: decks::DeckBase) -> interop::Timeline {
        interop::Timeline {
            id: e.id,
            title: e.name,

            points: None,
            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

fn from_row(row: &Row) -> Result<interop::SqliteTimeline> {
    Ok(interop::SqliteTimeline {
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

pub(crate) fn sqlite_get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> Result<interop::SqliteTimeline> {

    let conn = sqlite_pool.get()?;

    let (deck, _origin) = decks::sqlite_deckbase_get_or_create(&conn, user_id, DeckKind::Timeline, &title)?;

    Ok(deck.into())
}

pub(crate) fn sqlite_all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::SqliteTimeline>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(&conn,
                 "select id, name
                  from decks
                  where user_id = ?1 and kind = 'timeline'
                  order by created_at desc",
                 params![&user_id],
                 from_row)
}

pub(crate) fn sqlite_get(sqlite_pool: &SqlitePool, user_id: Key, timeline_id: Key) -> Result<interop::SqliteTimeline> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(&conn,
                           decks::DECKBASE_QUERY,
                           params![&user_id, &timeline_id, &sqlite_string_from_deck_kind(DeckKind::Timeline)],
                           from_row)?;

    Ok(deck.into())
}

pub(crate) fn sqlite_edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline: &interop::ProtoTimeline,
    timeline_id: Key,
) -> Result<interop::SqliteTimeline> {
    let conn = sqlite_pool.get()?;

    let graph_terminator = false;
    let deck = decks::sqlite_deckbase_edit(
        &conn,
        user_id,
        timeline_id,
        DeckKind::Timeline,
        &timeline.title,
        graph_terminator,
    )?;

    Ok(deck.into())
}

pub(crate) fn sqlite_delete(sqlite_pool: &SqlitePool, user_id: Key, timeline_id: Key) -> Result<()> {
    decks::sqlite_delete(sqlite_pool, user_id, timeline_id)
}
