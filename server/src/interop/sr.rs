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

use crate::interop::decks::LinkBack;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Card {
    pub id: Key,
    pub note_id: Key,
    pub deck_info: LinkBack,

    pub prompt: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoCard {
    pub note_id: Key,
    pub prompt: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoRating {
    pub rating: i16,
}

// only used between the handler and db, not passed out to the client
#[derive(Debug)]
pub struct CardInternal {
    pub id: Key,

    pub note_id: Key,
    pub prompt: String,
    pub next_test_date: chrono::DateTime<chrono::Utc>,

    pub easiness_factor: f32,
    pub inter_repetition_interval: i32,
}
