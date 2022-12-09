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

use crate::db::fix_bc_sort_order;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::{Error, Result};
use crate::interop::decks as interop_decks;
use crate::interop::points as interop;
use crate::interop::Key;

use rusqlite::{params, Connection, Row};
use std::fmt;
use std::str::FromStr;

impl fmt::Display for interop::PointKind {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            interop::PointKind::Point => write!(f, "point"),
            interop::PointKind::PointBegin => write!(f, "point_begin"),
            interop::PointKind::PointEnd => write!(f, "point_end"),
        }
    }
}

impl FromStr for interop::PointKind {
    type Err = Error;

    fn from_str(input: &str) -> Result<interop::PointKind> {
        match input {
            "point" => Ok(interop::PointKind::Point),
            "point_begin" => Ok(interop::PointKind::PointBegin),
            "point_end" => Ok(interop::PointKind::PointEnd),
            _ => Err(Error::StringConversionToEnum),
        }
    }
}

pub(crate) fn delete_all_points_connected_with_deck(conn: &Connection, deck_id: Key) -> Result<()> {
    sqlite::zero(
        conn,
        "DELETE FROM points
                  WHERE deck_id = ?1",
        params![&deck_id],
    )?;

    Ok(())
}

fn point_from_row(row: &Row) -> Result<interop::Point> {
    let sql_kind: String = row.get(1)?;
    Ok(interop::Point {
        id: row.get(0)?,
        kind: interop::PointKind::from_str(&sql_kind)?,
        title: row.get(2)?,

        location_textual: row.get(3)?,
        longitude: row.get(4)?,
        latitude: row.get(5)?,
        location_fuzz: row.get(6)?,

        date_textual: row.get(7)?,
        exact_date: row.get(8)?,
        lower_date: row.get(9)?,
        upper_date: row.get(10)?,
        date_fuzz: row.get(11)?,
    })
}

pub(crate) fn all(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::Point>> {
    let conn = sqlite_pool.get()?;

    // todo: unify all sqlite BC date handling code

    // bug: sqlite incorrectly sorts dates that begin in BC (it ignores the minus in the year)
    let points = sqlite::many(
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
        point_from_row,
    )?;

    fn grab_date(p: &interop::Point) -> Option<chrono::NaiveDate> {
        if p.exact_date.is_some() {
            p.exact_date
        } else {
            p.lower_date
        }
    }

    Ok(fix_bc_sort_order::<interop::Point>(points, grab_date))
}

fn deckpoint_from_row(row: &Row) -> Result<interop::DeckPoint> {
    let string_deck_kind: String = row.get(2)?;
    let string_point_kind: String = row.get(4)?;

    Ok(interop::DeckPoint {
        id: row.get(3)?,
        kind: interop::PointKind::from_str(&string_point_kind)?,
        title: row.get(5)?,
        date_textual: row.get(6)?,
        date: row.get(7)?,

        deck_id: row.get(0)?,
        deck_name: row.get(1)?,
        deck_resource: interop_decks::DeckKind::from_str(&string_deck_kind)?,
    })
}

pub(crate) fn all_points_during_life(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckPoint>> {
    let conn = sqlite_pool.get()?;

    // bug: sqlite incorrectly sorts dates that begin in BC (it ignores the minus in the year)
    let buggy = sqlite::many(
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
    )?;

    fn grab_date(d: &interop::DeckPoint) -> Option<chrono::NaiveDate> {
        d.date
    }
    Ok(fix_bc_sort_order::<interop::DeckPoint>(buggy, grab_date))
}

pub(crate) fn create(
    sqlite_pool: &SqlitePool,
    point: &interop::ProtoPoint,
    deck_id: Key,
) -> Result<()> {
    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "INSERT INTO points(deck_id, title, kind, location_textual, longitude, latitude, location_fuzz,
                            date_textual, exact_date, lower_date, upper_date, date_fuzz)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            &deck_id,
            &point.title,
            &point.kind.to_string(),
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
