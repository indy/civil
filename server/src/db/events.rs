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
use crate::error::Error;
use crate::interop::decks as interop_decks;
use crate::interop::decks::DeckKind;
use crate::interop::events as interop;
use crate::interop::font::Font;
use crate::interop::Key;

use rusqlite::{params, Row};

use tracing::error;

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

impl From<(decks::DeckBase, EventExtra)> for interop::Event {
    fn from(a: (decks::DeckBase, EventExtra)) -> interop::Event {
        let (deck, extra) = a;
        interop::Event {
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

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

fn event_extra_from_row(row: &Row) -> crate::Result<EventExtra> {
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

fn from_row(row: &Row) -> crate::Result<interop::Event> {
    let fnt: i32 = row.get(2)?;

    Ok(interop::Event {
        id: row.get(0)?,
        title: row.get(1)?,
        deck_kind: DeckKind::Event,
        insignia: row.get(3)?,
        font: Font::try_from(fnt)?,

        location_textual: row.get(4)?,
        longitude: row.get(5)?,
        latitude: row.get(6)?,
        location_fuzz: row.get(7)?,

        date_textual: row.get(8)?,
        exact_date: row.get(9)?,
        lower_date: row.get(10)?,
        upper_date: row.get(11)?,
        date_fuzz: row.get(12)?,

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
) -> crate::Result<interop::Event> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Event, title, Font::DeWalpergens)?;

    let event_extras =
        match origin {
            decks::DeckBaseOrigin::Created => sqlite::one(
                &tx,
                "INSERT INTO event_extras(deck_id)
                 VALUES (?1)
                 RETURNING location_textual, longitude, latitude, location_fuzz, date_textual, exact_realdate, lower_realdate, upper_realdate, date_fuzz",
                params![&deck.id],
                event_extra_from_row
            )?,
            decks::DeckBaseOrigin::PreExisting => sqlite::one(
                &tx,
                "select location_textual, longitude, latitude, location_fuzz, date_textual, exact_realdate, lower_realdate, upper_realdate, date_fuzz
                 from event_extras
                 where deck_id=?1",
                params![&deck.id],
                event_extra_from_row
            )?
        };

    tx.commit()?;

    Ok((deck, event_extras).into())
}

pub(crate) fn listings(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Vec<interop_decks::SlimDeck>> {
    let conn = sqlite_pool.get()?;

    // TODO: sort this by the event date in event_extras
    let stmt = "SELECT id, name, 'event', insignia, font
                FROM decks
                WHERE user_id = ?1 AND kind = 'event'
                ORDER BY created_at DESC";

    sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    event_id: Key,
) -> crate::Result<interop::Event> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.font, decks.insignia,
                       event_extras.location_textual, event_extras.longitude,
                       event_extras.latitude, event_extras.location_fuzz,
                       event_extras.date_textual, event_extras.exact_realdate,
                       event_extras.lower_realdate, event_extras.upper_realdate,
                       event_extras.date_fuzz
                FROM decks LEFT JOIN event_extras ON event_extras.deck_id = decks.id
                WHERE user_id = ?1 AND id = ?2";
    let res = sqlite::one(&conn, stmt, params![&user_id, &event_id], from_row)?;

    decks::hit(&conn, event_id)?;

    Ok(res)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    event: &interop::ProtoEvent,
    event_id: Key,
) -> crate::Result<interop::Event> {
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

    let stmt = "SELECT location_textual, longitude, latitude, location_fuzz,
                       date_textual, exact_realdate, lower_realdate,
                       upper_realdate, date_fuzz
                FROM event_extras
                WHERE deck_id = ?1";
    let event_extras_exists = sqlite::many(&tx, stmt, params![&event_id], event_extra_from_row)?;

    let sql_query: &str = match event_extras_exists.len() {
        0 => {
            "INSERT INTO event_extras(deck_id, location_textual, longitude, latitude, location_fuzz,
                       date_textual, exact_realdate, lower_realdate,
                       upper_realdate, date_fuzz)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
              RETURNING location_textual, longitude, latitude, location_fuzz, date_textual, exact_realdate, lower_realdate, upper_realdate, date_fuzz"
        }
        1 => {
            "UPDATE event_extras
             SET location_textual = ?2, longitude = ?3, latitude = ?4, location_fuzz = ?5, date_textual = ?6, exact_realdate = ?7, lower_realdate = ?8, upper_realdate = ?9, date_fuzz = ?10
              WHERE deck_id = ?1
              RETURNING location_textual, longitude, latitude, location_fuzz, date_textual, exact_realdate, lower_realdate, upper_realdate, date_fuzz"
        }
        _ => {
            // should be impossible to get here since deck_id
            // is a primary key in the event_extras table
            error!(
                "multiple event_extras entries for event: {}",
                &event_id
            );
            return Err(Error::TooManyFound);
        }
    };

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
        event_extra_from_row,
    )?;

    tx.commit()?;

    Ok((edited_deck, event_extras).into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, event_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, event_id)
}
