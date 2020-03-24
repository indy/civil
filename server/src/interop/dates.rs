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

use crate::interop::Key;

#[derive(PartialEq, Debug, serde::Deserialize, serde::Serialize)]
pub struct Date {
    pub id: Key,
    pub textual: Option<String>,
    pub exact_date: Option<chrono::NaiveDate>,
    pub lower_date: Option<chrono::NaiveDate>,
    pub upper_date: Option<chrono::NaiveDate>,
    pub fuzz: f32,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateDate {
    pub textual: Option<String>,
    pub exact_date: Option<chrono::NaiveDate>,
    pub lower_date: Option<chrono::NaiveDate>,
    pub upper_date: Option<chrono::NaiveDate>,
    pub fuzz: f32,
}

pub(crate) fn try_build(
    id: Option<Key>,
    textual: Option<String>,
    exact_date: Option<chrono::NaiveDate>,
    lower_date: Option<chrono::NaiveDate>,
    upper_date: Option<chrono::NaiveDate>,
    fuzz: Option<f32>,
) -> Option<Date> {
    if let Some(id) = id {
        Some(Date {
            id,
            textual,
            exact_date,
            lower_date,
            upper_date,
            fuzz: fuzz.unwrap_or(1.0),
        })
    } else {
        None
    }
}
