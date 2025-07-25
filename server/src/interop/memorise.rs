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

use crate::interop::decks::SlimDeck;
use crate::interop::Key;

pub struct CardUpcomingReview {
    pub review_count: i32,
    pub earliest_review_date: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: Key,
    pub note_id: Key,
    pub deck_info: SlimDeck,

    pub note_content: String,
    pub prompt: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoCard {
    pub note_id: Key,
    pub prompt: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoRating {
    pub rating: i16,
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashCard {
    pub id: Key,

    pub note_id: Key,
    pub prompt: String,
    pub next_test_date: chrono::NaiveDateTime,

    pub easiness_factor: f32,
    pub interval: i32,
    pub repetition: i32,
}
