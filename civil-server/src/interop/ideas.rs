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

use crate::interop::decks::{DeckSimple, Ref};
use crate::interop::notes::Note;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Idea {
    pub id: Key,
    pub title: String,

    pub graph_terminator: bool,

    pub created_at: chrono::DateTime<chrono::Utc>,

    pub notes: Option<Vec<Note>>,

    pub refs: Option<Vec<Ref>>,
    pub backrefs: Option<Vec<Ref>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SearchResults {
    pub results: Option<Vec<DeckSimple>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoIdea {
    pub title: String,
    pub graph_terminator: bool,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct IdeasListings {
    pub recent: Vec<Idea>,
    pub orphans: Vec<Idea>,
    pub unnoted: Vec<Idea>,
    pub all: Vec<Idea>,
}
