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
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::points::{Point, PointKind, ProtoPoint};
use rusqlite::{Row, named_params};
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
            id: row.get("id")?,
            kind: row.get("kind")?,
            title: row.get("title")?,
            font: row.get("font")?,

            location_textual: row.get("location_textual")?,

            date_textual: row.get("date_textual")?,
            date: row.get("date")?,

            deck_id: row.get("deck_id")?,
            deck_title: row.get("deck_name")?,
            deck_kind: row.get("deck_kind")?,
            deck_insignia: row.get("deck_insignia")?,
            deck_font: row.get("deck_font")?,
            deck_impact: row.get("deck_impact")?,
        })
    }
}

pub(crate) fn all(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<Point>, DbError> {
    let stmt = Qry::select("p.id as id")
        .comma("p.kind as kind")
        .comma("p.title as title")
        .comma("p.font as font")
        .comma("p.location_textual as location_textual")
        .comma("p.date_textual as date_textual")
        .comma("coalesce(date(p.exact_realdate), date(p.lower_realdate)) as date")
        .comma("d.id as deck_id")
        .comma("d.name as deck_name")
        .comma("d.kind as deck_kind")
        .comma("d.insignia as deck_insignia")
        .comma("d.font as deck_font")
        .comma("d.impact as deck_impact")
        .comma("coalesce(p.exact_realdate, p.lower_realdate) as sortdate")
        .from("decks d")
        .comma("points p")
        .where_clause("d.user_id = :user_id")
        .and("d.id = :deck_id")
        .and("p.deck_id = d.id")
        .order_by("sortdate");

    sqlite::many(
        &conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_id": deck_id},
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

fn query_points_common() -> Qry {
    Qry::select("p.id as id")
        .comma("p.kind as kind")
        .comma("p.title as title")
        .comma("p.font as font")
        .comma("p.location_textual as location_textual")
        .comma("p.date_textual as date_textual")
        .comma("coalesce(date(p.exact_realdate), date(p.lower_realdate)) as date")
        .comma("d.id as deck_id")
        .comma("d.name as deck_name")
        .comma("d.kind as deck_kind")
        .comma("d.insignia as deck_insignia")
        .comma("d.font as deck_font")
        .comma("d.impact as deck_impact")
        .comma("coalesce(p.exact_realdate, p.lower_realdate) as sortdate")
        .from("points p")
        .join("decks d ON p.deck_id = d.id")
        .where_clause("d.user_id = :user_id")
}

pub(crate) fn all_points_within_interval(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    lower: i32,
    upper: i32,
) -> Result<Vec<Point>, DbError> {
    let lower_year = year_as_date_string(lower);
    let upper_year = year_as_date_string(upper + 1);

    sqlite::many(
        &conn,
        &query_points_common()
            .and("date(coalesce(p.exact_realdate, p.upper_realdate)) >= :lower_year")
            .and("date(coalesce(p.exact_realdate, p.lower_realdate)) < :upper_year")
            .and("d.impact > 0")
            .order_by("sortdate"),
        named_params! {":user_id": user_id, ":lower_year": lower_year, ":upper_year": upper_year},
    )
}

pub(crate) fn all_points_during_life(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<Point>, DbError> {
    // all the points associated with a person (may include posthumous points)
    let all_for_person = query_points_common().and("d.id = :deck_id");

    // all the points between the person's birth and death (if not dead then up until the present day)
    let all_during_life = query_points_common()
        .and("coalesce(p.exact_realdate, p.upper_realdate) >= (select coalesce(point_born.exact_realdate, point_born.lower_realdate) as born from points point_born where point_born.deck_id = :deck_id and point_born.kind = 'point_begin')")
        .and("coalesce(p.exact_realdate, p.lower_realdate) <= coalesce((select coalesce(point_died.exact_realdate, point_died.upper_realdate) as died from points point_died where point_died.deck_id = :deck_id and point_died.kind = 'point_end'), CURRENT_DATE)")
        .and("d.id <> :deck_id")
        .and("d.impact > 0");

    // a union of the above two queries:
    let stmt = all_for_person
        .union()
        .add(&all_during_life)
        .order_by("sortdate");

    sqlite::many(
        &conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_id": deck_id},
    )
}

pub(crate) fn create(
    conn: &rusqlite::Connection,
    point: ProtoPoint,
    deck_id: Key,
) -> Result<(), DbError> {
    sqlite::zero(
        &conn,
        &Qry::insert("points(deck_id, title, kind, location_textual, longitude, latitude, location_fuzz, date_textual, exact_realdate, lower_realdate, upper_realdate, date_fuzz)")
            .values(
                ":deck_id, :title, :kind, :location_textual, :longitude, :latitude, :location_fuzz, :date_textual, julianday(:exact_realdate), julianday(:lower_realdate), julianday(:upper_realdate), :date_fuzz",
            ),
        named_params!{
            ":deck_id": deck_id,
            ":title": point.title,
            ":kind": point.kind,
            ":location_textual": point.location_textual,
            ":longitude": point.longitude,
            ":latitude": point.latitude,
            ":location_fuzz": point.location_fuzz,
            ":date_textual": point.date_textual,
            ":exact_realdate": point.exact_date,
            ":lower_realdate": point.lower_date,
            ":upper_realdate": point.upper_date,
            ":date_fuzz": point.date_fuzz,
        })
}
