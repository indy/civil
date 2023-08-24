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

use crate::interop::decks::{BackDeck, DeckKind, SlimDeck, SlimEvent};
use crate::interop::font::Font;
use crate::interop::memorise::FlashCard;
use crate::interop::notes::Note;
use crate::interop::points::Point;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub id: Key,
    pub title: String,

    pub deck_kind: DeckKind,

    pub insignia: i32,
    pub font: Font,

    pub sort_date: Option<chrono::NaiveDate>,

    // all the points that happened during a person's life. These may not be
    // directly connected to the person's life, but it's interesting to see
    // what was happening during their lifetime
    //
    pub points: Vec<Point>,
    pub events: Vec<SlimEvent>,

    pub notes: Vec<Note>,
    pub back_decks: Vec<BackDeck>,

    pub flashcards: Vec<FlashCard>,
}

impl From<crate::db::decks::DeckBase> for Person {
    fn from(d: crate::db::decks::DeckBase) -> Person {
        Person {
            id: d.id,
            title: d.title,

            deck_kind: DeckKind::Person,

            insignia: d.insignia,
            font: d.font,

            sort_date: None,

            points: vec![],
            events: vec![],

            notes: vec![],

            back_decks: vec![],

            flashcards: vec![],
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoPerson {
    pub title: String,

    pub insignia: i32,
    pub font: Font,
    pub graph_terminator: bool,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeopleListings {
    pub uncategorised: Vec<SlimDeck>,
    pub ancient: Vec<SlimDeck>,
    pub medieval: Vec<SlimDeck>,
    pub modern: Vec<SlimDeck>,
    pub contemporary: Vec<SlimDeck>,
}
