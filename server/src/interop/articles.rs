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

use crate::interop::decks::{Arrival, DeckKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::notes::Note;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Article {
    pub id: Key,
    pub title: String,
    pub deck_kind: DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,

    pub source: Option<String>,
    pub author: Option<String>,
    pub short_description: Option<String>,
    pub published_date: Option<chrono::NaiveDate>,

    pub notes: Vec<Note>,
    pub arrivals: Vec<Arrival>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoArticle {
    pub title: String,
    pub deck_kind: DeckKind,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,

    pub source: Option<String>,
    pub author: Option<String>,
    pub short_description: Option<String>,
    pub published_date: Option<chrono::NaiveDate>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleListings {
    pub recent: Vec<Article>,
    pub rated: Vec<Article>,
    pub orphans: Vec<SlimDeck>,
}
