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

use crate::interop::decks::{BackNote, DeckKind, Ref, SlimDeck};
use crate::interop::font::Font;
use crate::interop::memorise::FlashCard;
use crate::interop::notes::NewNote;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Idea {
    pub id: Key,
    pub title: String,

    pub deck_kind: DeckKind,

    pub insignia: i32,
    pub font: Font,

    pub graph_terminator: bool,

    pub created_at: chrono::NaiveDateTime,

    pub notes: Vec<NewNote>,

    pub backnotes: Vec<BackNote>,
    pub backrefs: Vec<Ref>,

    pub flashcards: Vec<FlashCard>,
}

impl From<crate::db::decks::DeckBase> for Idea {
    fn from(d: crate::db::decks::DeckBase) -> Idea {
        Idea {
            id: d.id,
            title: d.title,

            deck_kind: DeckKind::Idea,

            insignia: d.insignia,
            font: d.font,

            graph_terminator: d.graph_terminator,

            created_at: d.created_at,

            notes: vec![],

            backnotes: vec![],
            backrefs: vec![],

            flashcards: vec![],
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoIdea {
    pub title: String,

    pub insignia: i32,
    pub font: Font,
    pub graph_terminator: bool,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeasListings {
    pub recent: Vec<SlimDeck>,
    pub orphans: Vec<SlimDeck>,
    pub unnoted: Vec<SlimDeck>,
}
