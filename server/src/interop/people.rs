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

use crate::interop::decks::{BackNote, SlimDeck, Ref};
use crate::interop::notes::Note;
use crate::interop::points::DeckPoint;
use crate::interop::sr::FlashCard;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub id: Key,
    pub title: String,

    pub insignia: i32,

    pub sort_date: Option<chrono::NaiveDate>,

    // all the points that happened during a person's life. These may not be
    // directly connected to the person's life, but it's interesting to see
    // what was happening during their lifetime
    //
    pub points: Option<Vec<DeckPoint>>,

    pub notes: Option<Vec<Note>>,

    pub refs: Option<Vec<Ref>>,

    pub backnotes: Option<Vec<BackNote>>,
    pub backrefs: Option<Vec<Ref>>,

    pub flashcards: Option<Vec<FlashCard>>,
}

impl From<crate::db::decks::DeckBase> for Person {
    fn from(d: crate::db::decks::DeckBase) -> Person {
        Person {
            id: d.id,
            title: d.title,

            insignia: d.insignia,

            sort_date: None,
            points: None,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoPerson {
    pub title: String,
    pub insignia: i32,
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
