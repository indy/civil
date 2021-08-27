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

use crate::interop::decks::{BackNote, BackRef, Ref};
use crate::interop::notes::Note;
use crate::interop::points::{DeckPoint, Point};
use crate::interop::sr::FlashCard;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Person {
    pub id: Key,
    pub name: String,

    pub sort_date: Option<chrono::NaiveDate>,

    pub points: Option<Vec<Point>>,

    // all the points that happened during a person's life. These may not be
    // directly connected to the person's life, but it's interesting to see
    // what was happening during their lifetime
    //
    pub all_points_during_life: Option<Vec<DeckPoint>>,

    pub notes: Option<Vec<Note>>,

    pub refs: Option<Vec<Ref>>,

    pub backnotes: Option<Vec<BackNote>>,
    pub backrefs: Option<Vec<BackRef>>,

    pub flashcards: Option<Vec<FlashCard>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoPerson {
    pub name: String,
}
