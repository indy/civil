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
use crate::db::decks::{self, DeckBase, DeckBaseOrigin};
use crate::db::notes as notes_db;
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::events::{Event, ProtoEvent};
use crate::interop::font::Font;
use rusqlite::{Row, named_params};

#[allow(unused_imports)]
use tracing::{error, info};

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
            location_textual: row.get("location_textual")?,
            longitude: row.get("longitude")?,
            latitude: row.get("latitude")?,
            location_fuzz: row.get("location_fuzz")?,

            date_textual: row.get("date_textual")?,
            exact_date: row.get("exact_realdate")?,
            lower_date: row.get("lower_realdate")?,
            upper_date: row.get("upper_realdate")?,
            date_fuzz: row.get("date_fuzz")?,
        })
    }
}

impl FromRow for Event {
    fn from_row(row: &Row) -> rusqlite::Result<Event> {
        Ok(Event {
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,

            location_textual: row.get("location_textual")?,
            longitude: row.get("longitude")?,
            latitude: row.get("latitude")?,
            location_fuzz: row.get("location_fuzz")?,

            date_textual: row.get("date_textual")?,
            exact_date: row.get("exact_realdate")?,
            lower_date: row.get("lower_realdate")?,
            upper_date: row.get("upper_realdate")?,
            date_fuzz: row.get("date_fuzz")?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
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
                 VALUES (:deck_id, :title, :point_kind, :font)
                 RETURNING location_textual, longitude, latitude, location_fuzz,
                           date_textual, exact_realdate, lower_realdate,
                           upper_realdate, date_fuzz",
            named_params! {":deck_id": deck.id, ":title": title, ":point_kind": point_kind, ":font": default_font},
        )?,
        DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "SELECT location_textual, longitude, latitude, location_fuzz, date_textual,
                        date(exact_realdate), date(lower_realdate), date(upper_realdate),
                        date_fuzz
                 FROM points
                 WHERE deck_id=:deck_id",
            named_params! {":deck_id": deck.id},
        )?,
    };

    tx.commit()?;

    let mut event: Event = (deck, event_extras).into();

    event.notes = notes_db::notes_for_deck(conn, event.id)?;
    event.arrivals = notes_db::arrivals_for_deck(conn, event.id)?;

    Ok(event)
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<SlimDeck>, DbError> {
    // todo: sort this by the event date in event_extras
    let stmt = Qry::query_decklike_all_ordered("d.created_at DESC");

    sqlite::many(
        &conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Event},
    )
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    event_id: Key,
) -> Result<Option<Event>, DbError> {
    let mut event: Option<Event> = sqlite::one_optional(
        &conn,
        &Qry::select_decklike()
              .comma("points.location_textual as location_textual, points.longitude as longitude,
                      points.latitude as latitude, points.location_fuzz as location_fuzz,
                      points.date_textual as date_textual, date(points.exact_realdate) as exact_realdate,
                      date(points.lower_realdate) as lower_realdate, date(points.upper_realdate) as upper_realdate,
                      points.date_fuzz as date_fuzz")
              .from_decklike().left_join("points ON points.deck_id = d.id")
              .where_decklike(),
        named_params! {":user_id": user_id, ":deck_id": event_id, ":deck_kind": DeckKind::Event},
    )?;

    if let Some(ref mut i) = event {
        i.notes = notes_db::notes_for_deck(conn, event_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, event_id)?;
        decks::hit(&conn, event_id)?;
    }

    Ok(event)
}

pub(crate) fn edit(
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
             SET location_textual = :location_textual, longitude = :longitude, latitude = :latitude,
                 location_fuzz = :location_fuzz, date_textual = :date_textual,
                 exact_realdate = julianday(:exact_realdate), lower_realdate = julianday(:lower_realdate),
                 upper_realdate = julianday(:upper_realdate), date_fuzz = :date_fuzz
             WHERE deck_id = :deck_id
             RETURNING location_textual, longitude, latitude, location_fuzz, date_textual,
                       date(exact_realdate), date(lower_realdate), date(upper_realdate),
                       date_fuzz";

    let event_extras = sqlite::one(
        &tx,
        sql_query,
        named_params! {
            ":deck_id": event_id,
            ":location_textual": event.location_textual,
            ":longitude": event.longitude,
            ":latitude": event.latitude,
            ":location_fuzz": event.location_fuzz,
            ":date_textual": event.date_textual,
            ":exact_date": event.exact_date,
            ":lower_date": event.lower_date,
            ":upper_date": event.upper_date,
            ":date_fuzz": event.date_fuzz,
        },
    )?;

    tx.commit()?;

    let mut event: Event = (edited_deck, event_extras).into();

    event.notes = notes_db::notes_for_deck(conn, event_id)?;
    event.arrivals = notes_db::arrivals_for_deck(conn, event_id)?;

    Ok(event)
}
