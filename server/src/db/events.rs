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

use crate::db::decks::{self, DeckBase, DeckBaseOrigin};
use crate::db::notes as notes_db;
use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, SqlitePool, db};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::events::{Event, ProtoEvent};
use crate::interop::font::Font;

use rusqlite::{Row, params};

#[derive(Debug, Clone)]
struct EventExtra {
    location_textual: Option<String>,
    longitude: Option<f32>,
    latitude: Option<f32>,
    location_fuzz: f32,

    date_textual: Option<String>,
    exact_date: Option<chrono::NaiveDate>,
    lower_date: Option<chrono::NaiveDate>,
    upper_date: Option<chrono::NaiveDate>,
    date_fuzz: f32,
}

impl From<(DeckBase, EventExtra)> for Event {
    fn from(a: (DeckBase, EventExtra)) -> Event {
        let (deck, extra) = a;
        Event {
            id: deck.id,
            title: deck.title,

            deck_kind: DeckKind::Event,

            created_at: deck.created_at,
            graph_terminator: deck.graph_terminator,

            insignia: deck.insignia,
            font: deck.font,
            impact: deck.impact,

            location_textual: extra.location_textual,
            longitude: extra.longitude,
            latitude: extra.latitude,
            location_fuzz: extra.location_fuzz,

            date_textual: extra.date_textual,
            exact_date: extra.exact_date,
            lower_date: extra.lower_date,
            upper_date: extra.upper_date,
            date_fuzz: extra.date_fuzz,

            notes: vec![],
            arrivals: vec![],
        }
    }
}

impl FromRow for EventExtra {
    fn from_row(row: &Row) -> rusqlite::Result<EventExtra> {
        Ok(EventExtra {
            location_textual: row.get(0)?,
            longitude: row.get(1)?,
            latitude: row.get(2)?,
            location_fuzz: row.get(3)?,

            date_textual: row.get(4)?,
            exact_date: row.get(5)?,
            lower_date: row.get(6)?,
            upper_date: row.get(7)?,
            date_fuzz: row.get(8)?,
        })
    }
}

impl FromRow for Event {
    fn from_row(row: &Row) -> rusqlite::Result<Event> {
        Ok(Event {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,

            location_textual: row.get(8)?,
            longitude: row.get(9)?,
            latitude: row.get(10)?,
            location_fuzz: row.get(11)?,

            date_textual: row.get(12)?,
            exact_date: row.get(13)?,
            lower_date: row.get(14)?,
            upper_date: row.get(15)?,
            date_fuzz: row.get(16)?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

fn get_or_create_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Event, DbError> {
    let tx = conn.transaction()?;

    let default_font = Font::Serif;
    let (deck, origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Event,
        &title,
        false,
        0,
        default_font,
        1,
    )?;

    let point_kind = String::from("point");
    let event_extras = match origin {
        DeckBaseOrigin::Created => sqlite::one(
            &tx,
            "INSERT INTO points(deck_id, title, kind, font)
                 VALUES (?1, ?2, ?3, ?4)
                 RETURNING location_textual, longitude, latitude, location_fuzz,
                           date_textual, exact_realdate, lower_realdate,
                           upper_realdate, date_fuzz",
            params![&deck.id, title, &point_kind, &i32::from(default_font)],
        )?,
        DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "SELECT location_textual, longitude, latitude, location_fuzz, date_textual,
                        date(exact_realdate), date(lower_realdate), date(upper_realdate),
                        date_fuzz
                 FROM points
                 WHERE deck_id=?1",
            params![&deck.id],
        )?,
    };

    tx.commit()?;

    let mut event: Event = (deck, event_extras).into();

    event.notes = notes_db::notes_for_deck(conn, event.id)?;
    event.arrivals = notes_db::arrivals_for_deck(conn, event.id)?;

    Ok(event)
}

pub(crate) async fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: String,
) -> crate::Result<Event> {
    db(sqlite_pool, move |conn| {
        get_or_create_conn(conn, user_id, title)
    })
    .await
}

fn all_conn(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<SlimDeck>, DbError> {
    // todo: sort this by the event date in event_extras
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = 'event'
                ORDER BY created_at DESC";

    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) async fn all(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<SlimDeck>> {
    db(sqlite_pool, move |conn| all_conn(conn, user_id)).await
}

fn get_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    event_id: Key,
) -> Result<Option<Event>, DbError> {
    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at, decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       points.location_textual, points.longitude,
                       points.latitude, points.location_fuzz,
                       points.date_textual, date(points.exact_realdate),
                       date(points.lower_realdate), date(points.upper_realdate),
                       points.date_fuzz
                FROM decks LEFT JOIN points ON points.deck_id = decks.id
                WHERE user_id = ?1 AND decks.id = ?2 AND decks.kind = ?3";

    let mut event: Option<Event> = sqlite::one_optional(
        &conn,
        stmt,
        params![user_id, event_id, DeckKind::Event.to_string()],
    )?;

    if let Some(ref mut i) = event {
        i.notes = notes_db::notes_for_deck(conn, event_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, event_id)?;
        decks::hit(&conn, event_id)?;
    }

    Ok(event)
}

pub(crate) async fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    event_id: Key,
) -> crate::Result<Option<Event>> {
    db(sqlite_pool, move |conn| get_conn(conn, user_id, event_id)).await
}

fn edit_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    event: ProtoEvent,
    event_id: Key,
) -> Result<Event, DbError> {
    let tx = conn.transaction()?;

    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        event_id,
        DeckKind::Event,
        &event.title,
        event.graph_terminator,
        event.insignia,
        event.font,
        event.impact,
    )?;

    let sql_query = "
             UPDATE points
             SET location_textual = ?2, longitude = ?3, latitude = ?4, location_fuzz = ?5,
                 date_textual = ?6, exact_realdate = julianday(?7), lower_realdate = julianday(?8),
                 upper_realdate = julianday(?9), date_fuzz = ?10
             WHERE deck_id = ?1
             RETURNING location_textual, longitude, latitude, location_fuzz, date_textual,
                       date(exact_realdate), date(lower_realdate), date(upper_realdate),
                       date_fuzz";

    let event_extras = sqlite::one(
        &tx,
        sql_query,
        params![
            &event_id,
            &event.location_textual,
            &event.longitude,
            &event.latitude,
            &event.location_fuzz,
            &event.date_textual,
            &event.exact_date,
            &event.lower_date,
            &event.upper_date,
            &event.date_fuzz,
        ],
    )?;

    tx.commit()?;

    let mut event: Event = (edited_deck, event_extras).into();

    event.notes = notes_db::notes_for_deck(conn, event_id)?;
    event.arrivals = notes_db::arrivals_for_deck(conn, event_id)?;

    Ok(event)
}

pub(crate) async fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    event: ProtoEvent,
    event_id: Key,
) -> crate::Result<Event> {
    db(sqlite_pool, move |conn| {
        edit_conn(conn, user_id, event, event_id)
    })
    .await
}

pub(crate) async fn delete(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, deck_id).await
}
