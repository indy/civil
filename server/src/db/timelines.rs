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

use crate::db::DbError;
use crate::db::decks;
use crate::db::notes as notes_db;
use crate::db::points as points_db;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, ProtoSlimDeck};
use crate::interop::font::Font;
use crate::interop::timelines::Timeline;
use rusqlite::{Row, named_params};

impl FromRow for Timeline {
    fn from_row(row: &Row) -> rusqlite::Result<Timeline> {
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
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Timeline, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
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

// note that the order is different compared to ideas, concepts etc
pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Timeline>, DbError> {
    let stmt = "SELECT id, name, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = :user_id AND kind = :deck_kind
                ORDER BY created_at DESC";

    sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Timeline},
    )
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    timeline_id: Key,
) -> Result<Option<Timeline>, DbError> {
    let mut timeline: Option<Timeline> = sqlite::one_optional(
        &conn,
        decks::DECKBASE_QUERY,
        named_params! {":user_id": user_id, ":deck_id": timeline_id, ":deck_kind": DeckKind::Timeline},
    )?;

    if let Some(ref mut tl) = timeline {
        tl.points = points_db::all(conn, user_id, timeline_id)?;
        tl.notes = notes_db::notes_for_deck(conn, timeline_id)?;
        tl.arrivals = notes_db::arrivals_for_deck(conn, timeline_id)?;

        decks::hit(&conn, timeline_id)?;
    }

    Ok(timeline)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    timeline: ProtoSlimDeck,
    timeline_id: Key,
) -> Result<Timeline, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit(
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

fn augment(
    timeline: &mut Timeline,
    conn: &rusqlite::Connection,
    user_id: Key,
    timeline_id: Key,
) -> Result<(), DbError> {
    timeline.points = points_db::all(conn, user_id, timeline_id)?;
    timeline.notes = notes_db::notes_for_deck(conn, timeline_id)?;
    timeline.arrivals = notes_db::arrivals_for_deck(conn, timeline_id)?;

    Ok(())
}
