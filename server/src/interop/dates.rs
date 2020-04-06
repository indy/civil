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
pub struct ProtoDate {
    pub textual: Option<String>,
    pub exact_date: Option<chrono::NaiveDate>,
    pub lower_date: Option<chrono::NaiveDate>,
    pub upper_date: Option<chrono::NaiveDate>,
    pub fuzz: f32,
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

impl PartialEq<Date> for ProtoDate {
    fn eq(&self, other: &Date) -> bool {
        self.textual.as_deref() == other.textual.as_deref()
            && eq_naive_dates(self.exact_date, other.exact_date)
            && eq_naive_dates(self.lower_date, other.lower_date)
            && eq_naive_dates(self.upper_date, other.upper_date)
            && self.fuzz == other.fuzz
    }
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
