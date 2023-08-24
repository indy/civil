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

use crate::interop::decks::{BackNote, DeckKind, Ref};
use crate::interop::font::Font;
use crate::interop::memorise::FlashCard;
use crate::interop::notes::NewNote;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: Key,
    pub title: String,

    pub deck_kind: DeckKind,

    pub insignia: i32,
    pub font: Font,

    pub location_textual: Option<String>,
    pub longitude: Option<f32>,
    pub latitude: Option<f32>,
    pub location_fuzz: f32,

    pub date_textual: Option<String>,
    pub exact_date: Option<chrono::NaiveDate>,
    pub lower_date: Option<chrono::NaiveDate>,
    pub upper_date: Option<chrono::NaiveDate>,
    pub date_fuzz: f32,

    pub importance: i32,

    pub notes: Vec<NewNote>,

    pub backnotes: Vec<BackNote>,
    pub backrefs: Vec<Ref>,

    pub flashcards: Vec<FlashCard>,
}

impl From<crate::db::decks::DeckBase> for Event {
    fn from(d: crate::db::decks::DeckBase) -> Event {
        Event {
            id: d.id,
            title: d.title,

            deck_kind: DeckKind::Event,

            insignia: d.insignia,
            font: d.font,

            location_textual: None,
            longitude: None,
            latitude: None,
            location_fuzz: 0.0,

            date_textual: None,
            exact_date: None,
            lower_date: None,
            upper_date: None,
            date_fuzz: 1.0,

            importance: 0,

            notes: vec![],

            backnotes: vec![],
            backrefs: vec![],

            flashcards: vec![],
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoEvent {
    pub title: String,

    pub insignia: i32,
    pub font: Font,
    pub graph_terminator: bool,

    pub location_textual: Option<String>,
    pub longitude: Option<f32>,
    pub latitude: Option<f32>,
    pub location_fuzz: f32,

    pub date_textual: Option<String>,
    pub exact_date: Option<chrono::NaiveDate>,
    pub lower_date: Option<chrono::NaiveDate>,
    pub upper_date: Option<chrono::NaiveDate>,
    pub date_fuzz: f32,

    pub importance: i32,
}
