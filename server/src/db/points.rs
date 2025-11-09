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

use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, SqlitePool, db};
use crate::interop::Key;
use crate::interop::points::{Point, PointKind, ProtoPoint};

use rusqlite::{Row, params};
use std::fmt;

#[allow(unused_imports)]
use tracing::error;

impl fmt::Display for PointKind {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            PointKind::Point => write!(f, "point"),
            PointKind::PointBegin => write!(f, "point_begin"),
            PointKind::PointEnd => write!(f, "point_end"),
        }
    }
}

impl FromRow for Point {
    fn from_row(row: &Row) -> rusqlite::Result<Point> {
        Ok(Point {
            id: row.get(0)?,
            kind: row.get(1)?,
            title: row.get(2)?,
            font: row.get(3)?,

            location_textual: row.get(4)?,

            date_textual: row.get(5)?,
            date: row.get(6)?,

            deck_id: row.get(7)?,
            deck_title: row.get(8)?,
            deck_kind: row.get(9)?,
            deck_insignia: row.get(10)?,
            deck_font: row.get(11)?,
            deck_impact: row.get(12)?,
        })
    }
}

pub(crate) fn all_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<Point>, DbError> {
    sqlite::many(
        &conn,
        "select p.id,
                p.kind,
                p.title,
                p.font,
                p.location_textual,
                p.date_textual,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as date,
                d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                d.insignia as deck_insignia,
                d.font as deck_font,
                d.impact as deck_impact,
                coalesce(p.exact_realdate, p.lower_realdate) as sortdate
         from   decks d,
                points p
         where  d.user_id = ?1
                and d.id = ?2
                and p.deck_id = d.id
         order by sortdate",
        params![&user_id, &deck_id],
    )
}

fn year_as_date_string(year: i32) -> String {
    let mut res;

    if year >= 0 {
        res = year.to_string() + "-01-01";

        if (100..1000).contains(&year) {
            res = "0".to_owned() + &res;
        } else if (10..100).contains(&year) {
            res = "00".to_owned() + &res;
        } else if (0..10).contains(&year) {
            res = "000".to_owned() + &res;
        }
    } else {
        res = (-year).to_string() + "-01-01";

        if year > -10 && year < 0 {
            res = "-00".to_owned() + &res;
        } else if year > -100 && year < -9 {
            res = "-0".to_owned() + &res;
        } else if year > -1000 && year < -99 {
            res = "-".to_owned() + &res;
        } else {
            error!("year given to year_as_date_string is too old: {}", year);
        }
    }

    res
}

fn all_points_within_interval_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    lower: i32,
    upper: i32,
) -> Result<Vec<Point>, DbError> {
    let lower_year = year_as_date_string(lower);
    let upper_year = year_as_date_string(upper + 1);

    sqlite::many(
        &conn,
        "select p.id,
                p.kind,
                p.title,
                p.font,
                p.location_textual,
                p.date_textual,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as date,
                d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                d.insignia as deck_insignia,
                d.font as deck_font,
                d.impact as deck_impact,
                coalesce(p.exact_realdate, p.lower_realdate) as sortdate
         from   points p, decks d
         where  date(coalesce(p.exact_realdate, p.upper_realdate)) >= ?2
                and date(coalesce(p.exact_realdate, p.lower_realdate)) < ?3
                and p.deck_id = d.id
                and d.impact > 0
                and d.user_id = ?1
         order by sortdate",
        params![&user_id, &lower_year, &upper_year],
    )
}

pub(crate) async fn all_points_within_interval(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    lower: i32,
    upper: i32,
) -> crate::Result<Vec<Point>> {
    db(sqlite_pool, move |conn| {
        all_points_within_interval_conn(conn, user_id, lower, upper)
    })
    .await
}

pub(crate) fn all_points_during_life(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<Point>, DbError> {
    // a union of two queries:
    // 1. all the points associated with a person (may include posthumous points)
    // 2. all the points between the person's birth and death (if not dead then up until the present day)
    //
    sqlite::many(
        &conn,
        "select p.id,
                p.kind,
                p.title,
                p.font,
                p.location_textual,
                p.date_textual,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as date,
                d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                d.insignia as deck_insignia,
                d.font as deck_font,
                d.impact as deck_impact,
                coalesce(p.exact_realdate, p.lower_realdate) as sortdate
         from   points p, decks d
         where  d.id = ?2
                and d.user_id = ?1
                and p.deck_id = d.id
         union
         select p.id,
                p.kind,
                p.title,
                p.font,
                p.location_textual,
                p.date_textual,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as date,
                d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                d.insignia as deck_insignia,
                d.font as deck_font,
                d.impact as deck_impact,
                coalesce(p.exact_realdate, p.lower_realdate) as sortdate
         from   points p, decks d
         where  coalesce(p.exact_realdate, p.upper_realdate) >= (select coalesce(point_born.exact_realdate, point_born.lower_realdate) as born
                                                         from   points point_born
                                                         where  point_born.deck_id = ?2
                                                                and point_born.kind = 'point_begin')
                and coalesce(p.exact_realdate, p.lower_realdate) <= coalesce((select coalesce(point_died.exact_realdate, point_died.upper_realdate) as died
                                                                      from   points point_died
                                                                      where  point_died.deck_id = ?2
                                                                             and point_died.kind = 'point_end'), CURRENT_DATE)
                and p.deck_id = d.id
                and d.id <> ?2
                and d.impact > 0
                and d.user_id = ?1
         order by sortdate",
        params![&user_id, &deck_id],
    )
}

fn create_conn(
    conn: &rusqlite::Connection,
    point: ProtoPoint,
    deck_id: Key,
) -> Result<(), DbError> {
    sqlite::zero(
        &conn,
        "INSERT INTO points(deck_id, title, kind, location_textual, longitude, latitude, location_fuzz,
                            date_textual, exact_realdate, lower_realdate, upper_realdate, date_fuzz)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, julianday(?9), julianday(?10), julianday(?11), ?12)",
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

pub(crate) async fn create(
    sqlite_pool: &SqlitePool,
    point: ProtoPoint,
    deck_id: Key,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| create_conn(conn, point, deck_id)).await
}
