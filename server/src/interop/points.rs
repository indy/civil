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

use crate::interop::decks::DeckKind;
use crate::interop::font::Font;
use crate::interop::Key;

use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ValueRef};

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum PointKind {
    Point = 1,
    PointBegin,
    PointEnd,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoPoint {
    pub title: String,
    pub kind: PointKind,

    pub location_textual: Option<String>,
    pub longitude: Option<f32>,
    pub latitude: Option<f32>,
    pub location_fuzz: f32,

    pub date_textual: Option<String>,
    pub exact_date: Option<chrono::NaiveDate>,
    pub lower_date: Option<chrono::NaiveDate>,
    pub upper_date: Option<chrono::NaiveDate>,
    pub date_fuzz: f32,
}

#[derive(PartialEq, Eq, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub id: Key,
    pub kind: PointKind,
    pub title: String,
    pub font: Font,

    pub location_textual: Option<String>,

    pub date_textual: Option<String>,
    pub date: Option<chrono::NaiveDate>,

    pub deck_id: Key,
    pub deck_title: String,
    pub deck_kind: DeckKind,
    pub deck_insignia: i32,
    pub deck_font: Font,
    pub deck_impact: i32,
}

impl FromSql for PointKind {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let input = value.as_str()?;
        match input {
            "point" => Ok(PointKind::Point),
            "point_begin" => Ok(PointKind::PointBegin),
            "point_end" => Ok(PointKind::PointEnd),
            _ => Err(FromSqlError::InvalidType),
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointsWithinYears {
    pub lower_year: i32,
    pub upper_year: i32,
    pub points: Vec<Point>,
}
