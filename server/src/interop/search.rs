// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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
use crate::interop::notes::Note;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchDeck {
    pub rank: f32,
    pub deck: SlimDeck,
    pub notes: Vec<Note>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub search_text: String,
    pub deck_level: Vec<SearchDeck>,
    pub note_level: Vec<SearchDeck>,
}
