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

use crate::interop::decks::DeckReference;
use crate::interop::notes::Note;
use crate::interop::tags::TagReference;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Book {
    pub id: Key,
    pub title: String,
    pub author: Option<String>,

    pub notes: Option<Vec<Note>>,
    pub quotes: Option<Vec<Note>>,

    pub tags_in_notes: Option<Vec<TagReference>>,
    pub people_in_notes: Option<Vec<DeckReference>>,
    pub subjects_in_notes: Option<Vec<DeckReference>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateBook {
    pub title: String,
    pub author: Option<String>,
}
