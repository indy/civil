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

use crate::db::deck_kind::{self, DeckKind};
use crate::db::point_kind::PointKind;
use crate::error::{Error, Result};
use crate::interop::decks as interop_decks;
use crate::interop::points as interop;
use crate::interop::Key;

use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;


#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "points")]
struct Point {
    id: Key,
    kind: PointKind,
    title: Option<String>,

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

impl From<Point> for interop::Point {
    fn from(e: Point) -> interop::Point {
        interop::Point {
            id: e.id,
            kind: interop::PointKind::from(e.kind),
            title: e.title,

            location_textual: e.location_textual,
            longitude: e.longitude,
            latitude: e.latitude,
            location_fuzz: e.location_fuzz,

            date_textual: e.date_textual,
            exact_date: e.exact_date,
            lower_date: e.lower_date,
            upper_date: e.upper_date,
            date_fuzz: e.date_fuzz,
        }
    }
}

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "points")]
struct DeckPoint {
    id: Key,
    kind: PointKind,
    title: Option<String>,
    date_textual: Option<String>,
    date: Option<chrono::NaiveDate>,

    deck_id: Key,
    deck_name: String,
    deck_kind: DeckKind,
}

impl From<DeckPoint> for interop::DeckPoint {
    fn from(e: DeckPoint) -> interop::DeckPoint {
        interop::DeckPoint {
            id: e.id,
            kind: interop::PointKind::from(e.kind),
            title: e.title,
            date_textual: e.date_textual,
            date: e.date,

            deck_id: e.deck_id,
            deck_name: e.deck_name,
            deck_resource: interop_decks::DeckResource::from(e.deck_kind),
        }
    }
}


use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Connection, Row, params};

pub(crate) fn sqlite_delete_all_points_connected_with_deck(
    conn: &Connection,
    deck_id: Key,
) -> Result<()> {
    sqlite::zero(&conn,
                 "DELETE FROM points
                  WHERE deck_id = ?1",
                 params![&deck_id])?;

    Ok(())
}

pub(crate) fn point_kind_from_sqlite_string(s: String) -> Result<interop::PointKind> {
    if s == "point" {
        Ok(interop::PointKind::Point)
    } else if s == "point_begin" {
        Ok(interop::PointKind::PointBegin)
    } else if s == "point_end" {
        Ok(interop::PointKind::PointEnd)
    } else {
        Err(Error::SqliteStringConversion)
    }
}

pub(crate) fn sqlite_string_from_point_kind(pk: interop::PointKind) -> Result<String> {
    if pk == interop::PointKind::Point {
        Ok("point".to_string())
    } else if pk == interop::PointKind::PointBegin {
        Ok("point_begin".to_string())
    } else if pk == interop::PointKind::PointEnd {
        Ok("point_end".to_string())
    } else {
        Err(Error::SqliteStringConversion)
    }
}

fn sqlite_point_from_row(row: &Row) -> Result<interop::Point> {
    Ok(interop::Point {
        id: row.get(0)?,
        kind: point_kind_from_sqlite_string(row.get(1)?)?,
        title: row.get(2)?,

        location_textual: row.get(3)?,
        longitude: row.get(4)?,
        latitude: row.get(5)?,
        location_fuzz: row.get(6)?,

        date_textual: row.get(7)?,
        exact_date: row.get(8)?,
        lower_date: row.get(9)?,
        upper_date: row.get(10)?,
        date_fuzz: row.get(11)?
    })
}

pub(crate) fn sqlite_all(sqlite_pool: &SqlitePool, user_id: Key, deck_id: Key) -> Result<Vec<interop::Point>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "select p.id,
                p.kind,
                p.title,
                p.location_textual,
                p.longitude,
                p.latitude,
                p.location_fuzz,
                p.date_textual,
                p.exact_date,
                p.lower_date,
                p.upper_date,
                p.date_fuzz
         from   decks d,
                points p
         where  d.user_id = ?1
                and d.id = ?2
                and p.deck_id = d.id
         order by coalesce(p.exact_date, p.lower_date)",
        params![&user_id, &deck_id],
        sqlite_point_from_row
    )
}


fn deckpoint_from_row(row: &Row) -> Result<interop::DeckPoint> {
    let kind: String = row.get(2)?;
    let deck_kind = deck_kind::deck_kind_from_sqlite_string(kind.as_str())?;

    Ok(interop::DeckPoint {
        id: row.get(3)?,
        kind: point_kind_from_sqlite_string(row.get(4)?)?,
        title: row.get(5)?,
        date_textual: row.get(6)?,
        date: row.get(7)?,

        deck_id: row.get(0)?,
        deck_name: row.get(1)?,
        deck_resource: interop_decks::DeckResource::from(deck_kind)
    })
}

pub(crate) fn sqlite_all_points_during_life(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckPoint>> {
    let conn = sqlite_pool.get()?;
    sqlite::many(
        &conn,
        "select d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                p.id,
                p.kind,
                p.title,
                p.date_textual,
                coalesce(p.exact_date, p.lower_date) as date
         from   points p, decks d
         where  d.id = ?2
                and d.user_id = ?1
                and p.deck_id = d.id
         union
         select d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                p.id,
                p.kind,
                p.title,
                p.date_textual,
                coalesce(p.exact_date, p.lower_date) as date
         from   points p, decks d
         where  coalesce(p.exact_date, p.upper_date) >= (select coalesce(point_born.exact_date, point_born.lower_date) as born
                                                         from   points point_born
                                                         where  point_born.deck_id = ?2
                                                                and point_born.kind = 'point_begin')
                and coalesce(p.exact_date, p.lower_date) <= coalesce((select coalesce(point_died.exact_date, point_died.upper_date) as died
                                                                      from   points point_died
                                                                      where  point_died.deck_id = ?2
                                                                             and point_died.kind = 'point_end'), CURRENT_DATE)
                and p.deck_id = d.id
                and d.id <> ?2
                and d.user_id = ?1
         order by date",
        params![&user_id, &deck_id],
        deckpoint_from_row
    )
}


pub(crate) fn sqlite_create(
    sqlite_pool: &SqlitePool,
    point: &interop::ProtoPoint,
    deck_id: Key,
) -> Result<()> {

    let conn = sqlite_pool.get()?;
    let pks = sqlite_string_from_point_kind(point.kind)?;

    sqlite::zero(
        &conn,
        "INSERT INTO points(deck_id, title, kind, location_textual, longitude, latitude, location_fuzz,
                            date_textual, exact_date, lower_date, upper_date, date_fuzz)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            &deck_id,
            &point.title,
            &pks,
            &point.location_textual,
            &point.longitude,
            &point.latitude,
            &point.location_fuzz,
            &point.date_textual,
            &point.exact_date,
            &point.lower_date,
            &point.upper_date,
            &point.date_fuzz,
        ])
}
