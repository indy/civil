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
pub struct Location {
    pub id: Key,
    pub textual: Option<String>,
    pub longitude: Option<f32>,
    pub latitude: Option<f32>,
    pub fuzz: f32,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoLocation {
    pub textual: Option<String>,
    pub longitude: Option<f32>,
    pub latitude: Option<f32>,
    pub fuzz: f32,
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

impl PartialEq<Location> for ProtoLocation {
    fn eq(&self, other: &Location) -> bool {
        self.textual.as_deref() == other.textual.as_deref()
            && eq_f32(self.longitude, other.longitude)
            && eq_f32(self.latitude, other.latitude)
            && self.fuzz == other.fuzz
    }
}

pub(crate) fn try_build(
    id: Option<Key>,
    textual: Option<String>,
    longitude: Option<f32>,
    latitude: Option<f32>,
    fuzz: Option<f32>,
) -> Option<Location> {
    if let Some(id) = id {
        Some(Location {
            id,
            textual,
            longitude,
            latitude,
            fuzz: fuzz.unwrap_or(0.0),
        })
    } else {
        None
    }
}
