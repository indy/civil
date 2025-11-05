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

use crate::db::notes as notes_db;
use crate::db::points as points_db;
use crate::db::decks;
use crate::db::decks::DECKBASE_QUERY;
use crate::db::{SqlitePool, DbError, db};
use crate::db::sqlite::{self, FromRow};
use crate::interop::decks::{DeckKind, ProtoSlimDeck};
use crate::interop::font::Font;
use crate::interop::timelines::Timeline;
use crate::interop::Key;
use rusqlite::{params, OptionalExtension, Row};

fn from_rusqlite_row(row: &Row) -> rusqlite::Result<Timeline> {
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

    fn from_row_conn(row: &Row) -> Result<Timeline, DbError> {
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

fn get_or_create_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String
) -> Result<Timeline, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create_conn(
        &tx,
        user_id,
        DeckKind::Timeline,
        &title,
        false,
        0,
        Font::Serif,
        1,
    )?;

    tx.commit()?;

    let mut timeline: Timeline = deck.into();
    let id = timeline.id;

    augment(&mut timeline, conn, user_id, id)?;

    Ok(timeline)
}


pub(crate) async fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: String,
) -> crate::Result<Timeline> {
    db(sqlite_pool, move |conn| get_or_create_conn(conn, user_id, title))
        .await
        .map_err(Into::into)
}

// note that the order is different compared to ideas, concepts etc
fn listings_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
) -> Result<Vec<Timeline>, DbError> {
    let stmt = "SELECT id, name, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = 'timeline'
                ORDER BY created_at DESC";

    sqlite::many_conn(&conn, stmt, params![&user_id])
}


pub(crate) async fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<Timeline>> {
    db(sqlite_pool, move |conn| listings_conn(conn, user_id))
        .await
        .map_err(Into::into)
}



fn get_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    timeline_id: Key
) -> Result<Option<Timeline>, DbError> {
    let mut timeline = conn.prepare_cached(DECKBASE_QUERY)?
        .query_row(params![user_id, timeline_id, DeckKind::Timeline.to_string()], |row| from_rusqlite_row(row))
        .optional()?;

    if let Some(ref mut tl) = timeline {
        tl.points = points_db::all_conn(conn, user_id, timeline_id)?;
        tl.notes = notes_db::notes_for_deck_conn(conn, timeline_id)?;
        tl.arrivals = notes_db::arrivals_for_deck_conn(conn, timeline_id)?;
    }

    decks::hit_conn(&conn, timeline_id)?;

    Ok(timeline)
}

pub(crate) async fn get(sqlite_pool: &SqlitePool, user_id: Key, timeline_id: Key) -> crate::Result<Option<Timeline>> {
    db(sqlite_pool, move |conn| get_conn(conn, user_id, timeline_id))
        .await
        .map_err(Into::into)
}

fn edit_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    timeline: ProtoSlimDeck,
    timeline_id: Key
) -> Result<Timeline, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit_conn(
        &tx,
        user_id,
        timeline_id,
        DeckKind::Timeline,
        &timeline.title,
        timeline.graph_terminator,
        timeline.insignia,
        timeline.font,
        timeline.impact,
    )?;

    tx.commit()?;

    let mut timeline: Timeline = deck.into();

    augment(&mut timeline, conn, user_id, timeline_id)?;

    Ok(timeline)
}

pub(crate) async fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    timeline: ProtoSlimDeck,
    timeline_id: Key,
) -> crate::Result<Timeline> {
    db(sqlite_pool, move |conn| edit_conn(conn, user_id, timeline, timeline_id))
        .await
        .map_err(Into::into)
}


fn delete_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    timeline_id: Key
) -> Result<(), DbError> {

    decks::delete_conn(&conn, user_id, timeline_id)?;

    Ok(())
}

pub(crate) async fn delete(sqlite_pool: &SqlitePool, user_id: Key, timeline_id: Key) -> crate::Result<()> {
    db(sqlite_pool, move |conn| delete_conn(conn, user_id, timeline_id))
        .await
        .map_err(Into::into)
}

fn augment(timeline: &mut Timeline, conn: &rusqlite::Connection, user_id: Key, timeline_id: Key) -> Result<(), DbError> {
    timeline.points = points_db::all_conn(conn, user_id, timeline_id)?;
    timeline.notes = notes_db::notes_for_deck_conn(conn, timeline_id)?;
    timeline.arrivals = notes_db::arrivals_for_deck_conn(conn, timeline_id)?;

    Ok(())
}
