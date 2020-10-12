// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

use crate::interop::decks::DeckResource;
use crate::interop::Key;

#[derive(Copy, Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum PointKind {
    Point,
    PointBegin,
    PointEnd,
}

#[derive(PartialEq, Debug, serde::Deserialize, serde::Serialize)]
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

// used when returning all the points that happened during a person's life
#[derive(PartialEq, Debug, serde::Deserialize, serde::Serialize)]
pub struct DeckPoint {
    pub deck_id: Key,
    pub deck_name: String,
    pub deck_resource: DeckResource,

    pub point_id: Key,
    pub point_kind: PointKind,
    pub point_title: Option<String>,
    pub point_date_textual: Option<String>,
    pub point_date: Option<chrono::NaiveDate>,
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
/*
pub(crate) fn try_build(
    id: Option<Key>,

    title: Option<String>,

    location_textual: Option<String>,
    longitude: Option<f32>,
    latitude: Option<f32>,
    location_fuzz: Option<f32>,

    date_textual: Option<String>,
    exact_date: Option<chrono::NaiveDate>,
    lower_date: Option<chrono::NaiveDate>,
    upper_date: Option<chrono::NaiveDate>,
    date_fuzz: Option<f32>,
) -> Option<Point> {
    if let Some(id) = id {
        Some(Point {
            id,

            title,

            location_textual,
            longitude,
            latitude,
            location_fuzz: location_fuzz.unwrap_or(0.0),

            date_textual,
            exact_date,
            lower_date,
            upper_date,
            date_fuzz: date_fuzz.unwrap_or(1.0),
        })
    } else {
        None
    }
}
*/
