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

use crate::interop::decks::{Arrival, DeckKind};
use crate::interop::font::Font;
use crate::interop::notes::Note;
use crate::interop::points::Point;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Timeline {
    pub id: Key,
    pub title: String,
    pub deck_kind: DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,

    pub insignia: i32,
    pub font: Font,
    pub impact: i32,

    pub points: Vec<Point>,

    pub notes: Vec<Note>,
    pub arrivals: Vec<Arrival>,
}

impl From<crate::db::decks::DeckBase> for Timeline {
    fn from(d: crate::db::decks::DeckBase) -> Timeline {
        Timeline {
            id: d.id,
            title: d.title,

            deck_kind: DeckKind::Timeline,
            created_at: d.created_at,
            graph_terminator: d.graph_terminator,

            insignia: d.insignia,
            font: d.font,
            impact: d.impact,

            points: vec![],

            notes: vec![],
            arrivals: vec![],
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoTimeline {
    pub title: String,
    pub deck_kind: DeckKind,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,
}
