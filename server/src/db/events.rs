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
use crate::db::sqlite::{self, FromRow, SqlitePool};
use crate::interop::decks::{DeckKind, SlimDeck, SlimEvent};
use crate::interop::events::{Event, ProtoEvent};
use crate::interop::font::Font;
use crate::interop::Key;

use rusqlite::{params, Row};

use tracing::info;

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

    importance: i32,
}

impl From<(DeckBase, EventExtra)> for Event {
    fn from(a: (DeckBase, EventExtra)) -> Event {
        let (deck, extra) = a;
        Event {
            id: deck.id,
            title: deck.title,

            deck_kind: DeckKind::Event,

            insignia: deck.insignia,
            font: deck.font,

            location_textual: extra.location_textual,
            longitude: extra.longitude,
            latitude: extra.latitude,
            location_fuzz: extra.location_fuzz,

            date_textual: extra.date_textual,
            exact_date: extra.exact_date,
            lower_date: extra.lower_date,
            upper_date: extra.upper_date,
            date_fuzz: extra.date_fuzz,

            importance: extra.importance,

            notes: vec![],
            arrivals: vec![],
        }
    }
}

impl FromRow for EventExtra {
    fn from_row(row: &Row) -> crate::Result<EventExtra> {
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

            importance: row.get(9)?,
        })
    }
}

impl FromRow for Event {
    fn from_row(row: &Row) -> crate::Result<Event> {
        Ok(Event {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: DeckKind::Event,
            insignia: row.get(3)?,
            font: row.get(2)?,

            location_textual: row.get(4)?,
            longitude: row.get(5)?,
            latitude: row.get(6)?,
            location_fuzz: row.get(7)?,

            date_textual: row.get(8)?,
            exact_date: row.get(9)?,
            lower_date: row.get(10)?,
            upper_date: row.get(11)?,
            date_fuzz: row.get(12)?,

            importance: row.get(13)?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

impl FromRow for SlimEvent {
    fn from_row(row: &Row) -> crate::Result<SlimEvent> {
        Ok(SlimEvent {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: DeckKind::Event,
            graph_terminator: row.get(3)?,
            insignia: row.get(4)?,
            font: row.get(5)?,

            location_textual: row.get(6)?,

            date_textual: row.get(7)?,
            date: row.get(8)?,
        })
    }
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> crate::Result<Event> {
    info!("get_or_create");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Event, title, Font::DeWalpergens)?;

    let event_extras = match origin {
        DeckBaseOrigin::Created => sqlite::one(
            &tx,
            "INSERT INTO event_extras(deck_id)
                 VALUES (?1)
                 RETURNING location_textual, longitude, latitude, location_fuzz,
                           date_textual, exact_realdate, lower_realdate,
                           upper_realdate, date_fuzz, importance",
            params![&deck.id],
        )?,
        DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "SELECT location_textual, longitude, latitude, location_fuzz, date_textual,
                        date(exact_realdate), date(lower_realdate), date(upper_realdate),
                        date_fuzz, importance
                 FROM event_extras
                 WHERE deck_id=?1",
            params![&deck.id],
        )?,
    };

    tx.commit()?;

    Ok((deck, event_extras).into())
}

pub(crate) fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    // TODO: sort this by the event date in event_extras
    let stmt = "SELECT id, name, 'event', insignia, font, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND kind = 'event'
                ORDER BY created_at DESC";

    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key, event_id: Key) -> crate::Result<Event> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.font, decks.insignia,
                       event_extras.location_textual, event_extras.longitude,
                       event_extras.latitude, event_extras.location_fuzz,
                       event_extras.date_textual, date(event_extras.exact_realdate),
                       date(event_extras.lower_realdate), date(event_extras.upper_realdate),
                       event_extras.date_fuzz, event_extras.importance
                FROM decks LEFT JOIN event_extras ON event_extras.deck_id = decks.id
                WHERE user_id = ?1 AND id = ?2";
    let res = sqlite::one(&conn, stmt, params![&user_id, &event_id])?;

    decks::hit(&conn, event_id)?;

    Ok(res)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    event: &ProtoEvent,
    event_id: Key,
) -> crate::Result<Event> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        event_id,
        DeckKind::Event,
        &event.title,
        graph_terminator,
        event.insignia,
        event.font,
    )?;

    let sql_query = "
             UPDATE event_extras
             SET location_textual = ?2, longitude = ?3, latitude = ?4, location_fuzz = ?5,
                 date_textual = ?6, exact_realdate = julianday(?7), lower_realdate = julianday(?8),
                 upper_realdate = julianday(?9), date_fuzz = ?10, importance = ?11
             WHERE deck_id = ?1
             RETURNING location_textual, longitude, latitude, location_fuzz, date_textual,
                       date(exact_realdate), date(lower_realdate), date(upper_realdate),
                       date_fuzz, importance";

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
            &event.importance,
        ],
    )?;

    tx.commit()?;

    Ok((edited_deck, event_extras).into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, event_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, event_id)
}

pub(crate) fn all_events_during_life(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<SlimEvent>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT d.id,
                d.name as title,
                d.kind as deck_kind,
                d.graph_terminator,
                d.insignia,
                d.font,
                ee.location_textual,
                ee.date_textual,
                coalesce(date(ee.exact_realdate), date(ee.lower_realdate)) AS date,
                coalesce(ee.exact_realdate, ee.lower_realdate) AS sortdate
         FROM   event_extras ee, decks d
         WHERE  COALESCE(ee.exact_realdate, ee.upper_realdate) >= (
                    SELECT COALESCE(point_born.exact_realdate, point_born.lower_realdate) AS born
                    FROM   points point_born
                    WHERE  point_born.deck_id = ?2 AND point_born.kind = 'point_begin'
                ) AND coalesce(ee.exact_realdate, ee.lower_realdate) <= COALESCE((
                    SELECT COALESCE(point_died.exact_realdate, point_died.upper_realdate) AS died
                    FROM   points point_died
                    WHERE  point_died.deck_id = ?2 AND point_died.kind = 'point_end'), CURRENT_DATE)
                AND ee.deck_id = d.id
                AND d.user_id = ?1
         ORDER BY sortdate",
        params![&user_id, &deck_id],
    )
}
