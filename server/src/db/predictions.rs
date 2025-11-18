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
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::predictions::{Prediction, ProtoPrediction};
use crate::interop::font::Font;

use rusqlite::{Row, params};

#[derive(Debug, Clone)]
struct PredictionExtra {
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

impl From<(DeckBase, PredictionExtra)> for Prediction {
    fn from(a: (DeckBase, PredictionExtra)) -> Prediction {
        let (deck, extra) = a;
        Prediction {
            id: deck.id,
            title: deck.title,

            deck_kind: DeckKind::Prediction,

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

impl FromRow for PredictionExtra {
    fn from_row(row: &Row) -> rusqlite::Result<PredictionExtra> {
        Ok(PredictionExtra {
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

impl FromRow for Prediction {
    fn from_row(row: &Row) -> rusqlite::Result<Prediction> {
        Ok(Prediction {
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

pub(crate) fn get_or_create(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Prediction, DbError> {
    let tx = conn.transaction()?;

    let default_font = Font::Serif;
    let (deck, origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Prediction,
        &title,
        false,
        0,
        default_font,
        1,
    )?;

    let point_kind = String::from("point");
    let prediction_extras = match origin {
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

    let mut prediction: Prediction = (deck, prediction_extras).into();

    prediction.notes = notes_db::notes_for_deck(conn, prediction.id)?;
    prediction.arrivals = notes_db::arrivals_for_deck(conn, prediction.id)?;

    Ok(prediction)
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<SlimDeck>, DbError> {
    // todo: sort this by the prediction date in prediction_extras
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = 'prediction'
                ORDER BY created_at DESC";

    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    prediction_id: Key,
) -> Result<Option<Prediction>, DbError> {
    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at, decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       points.location_textual, points.longitude,
                       points.latitude, points.location_fuzz,
                       points.date_textual, date(points.exact_realdate),
                       date(points.lower_realdate), date(points.upper_realdate),
                       points.date_fuzz
                FROM decks LEFT JOIN points ON points.deck_id = decks.id
                WHERE user_id = ?1 AND decks.id = ?2 AND decks.kind = ?3";

    let mut prediction: Option<Prediction> = sqlite::one_optional(
        &conn,
        stmt,
        params![user_id, prediction_id, DeckKind::Prediction.to_string()],
    )?;

    if let Some(ref mut i) = prediction {
        i.notes = notes_db::notes_for_deck(conn, prediction_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, prediction_id)?;
        decks::hit(&conn, prediction_id)?;
    }

    Ok(prediction)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    prediction: ProtoPrediction,
    prediction_id: Key,
) -> Result<Prediction, DbError> {
    let tx = conn.transaction()?;

    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        prediction_id,
        DeckKind::Prediction,
        &prediction.title,
        prediction.graph_terminator,
        prediction.insignia,
        prediction.font,
        prediction.impact,
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

    let prediction_extras = sqlite::one(
        &tx,
        sql_query,
        params![
            &prediction_id,
            &prediction.location_textual,
            &prediction.longitude,
            &prediction.latitude,
            &prediction.location_fuzz,
            &prediction.date_textual,
            &prediction.exact_date,
            &prediction.lower_date,
            &prediction.upper_date,
            &prediction.date_fuzz,
        ],
    )?;

    tx.commit()?;

    let mut prediction: Prediction = (edited_deck, prediction_extras).into();

    prediction.notes = notes_db::notes_for_deck(conn, prediction_id)?;
    prediction.arrivals = notes_db::arrivals_for_deck(conn, prediction_id)?;

    Ok(prediction)
}
