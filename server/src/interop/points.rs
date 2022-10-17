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
use crate::interop::Key;

#[derive(Copy, Clone, Debug, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
pub enum PointKind {
    Point,
    PointBegin,
    PointEnd,
}

#[derive(PartialEq, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub id: Key,
    pub kind: PointKind,
    pub title: Option<String>,

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

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoPoint {
    pub title: Option<String>,
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

// a point with additional information about the deck that 'owns' the point
// (used when returning all the points that happened during a person's life)
//
#[derive(PartialEq, Eq, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckPoint {
    pub id: Key,
    pub kind: PointKind,
    pub title: Option<String>,
    pub date_textual: Option<String>,
    pub date: Option<chrono::NaiveDate>,

    pub deck_id: Key,
    pub deck_name: String,
    pub deck_resource: DeckKind,
}

fn eq_naive_dates(a: Option<chrono::NaiveDate>, b: Option<chrono::NaiveDate>) -> bool {
    if let Some(ad) = a {
        if let Some(bd) = b {
            ad == bd
        } else {
            false
        }
    } else {
        false
    }
}

// probably a better way of doing this
//
fn eq_f32(a: Option<f32>, b: Option<f32>) -> bool {
    if let Some(ad) = a {
        if let Some(bd) = b {
            ad == bd
        } else {
            false
        }
    } else {
        false
    }
}

impl PartialEq<Point> for ProtoPoint {
    fn eq(&self, other: &Point) -> bool {
        self.title == other.title
            && self.location_textual.as_deref() == other.location_textual.as_deref()
            && eq_f32(self.longitude, other.longitude)
            && eq_f32(self.latitude, other.latitude)
            && self.location_fuzz == other.location_fuzz
            && self.date_textual.as_deref() == other.date_textual.as_deref()
            && eq_naive_dates(self.exact_date, other.exact_date)
            && eq_naive_dates(self.lower_date, other.lower_date)
            && eq_naive_dates(self.upper_date, other.upper_date)
            && self.date_fuzz == other.date_fuzz
    }
}
