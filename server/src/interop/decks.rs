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

use crate::interop::font::Font;
use crate::interop::notes::Note;
use crate::interop::Key;

use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ValueRef};

use std::fmt;

// isg note: update the db/stats.rs when adding a new DeckKind
//
#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum DeckKind {
    Article = 1,
    Person,
    Idea,
    Timeline,
    Quote,
    Dialogue,
    Event,
}

impl fmt::Display for DeckKind {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DeckKind::Article => write!(f, "article"),
            DeckKind::Person => write!(f, "person"),
            DeckKind::Idea => write!(f, "idea"),
            DeckKind::Timeline => write!(f, "timeline"),
            DeckKind::Quote => write!(f, "quote"),
            DeckKind::Dialogue => write!(f, "dialogue"),
            DeckKind::Event => write!(f, "event"),
        }
    }
}

impl FromSql for DeckKind {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let input = value.as_str()?;
        match input {
            "article" => Ok(DeckKind::Article),
            "person" => Ok(DeckKind::Person),
            "idea" => Ok(DeckKind::Idea),
            "timeline" => Ok(DeckKind::Timeline),
            "quote" => Ok(DeckKind::Quote),
            "dialogue" => Ok(DeckKind::Dialogue),
            "event" => Ok(DeckKind::Event),
            _ => Err(FromSqlError::InvalidType),
        }
    }
}

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum RefKind {
    Ref = 1,
    RefToParent,
    RefToChild,
    RefInContrast,
    RefCritical,
}

impl fmt::Display for RefKind {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            RefKind::Ref => write!(f, "ref"),
            RefKind::RefToParent => write!(f, "ref_to_parent"),
            RefKind::RefToChild => write!(f, "ref_to_child"),
            RefKind::RefInContrast => write!(f, "ref_in_contrast"),
            RefKind::RefCritical => write!(f, "ref_critical"),
        }
    }
}

impl FromSql for RefKind {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let input = value.as_str()?;
        match input {
            "ref" => Ok(RefKind::Ref),
            "ref_to_parent" => Ok(RefKind::RefToParent),
            "ref_to_child" => Ok(RefKind::RefToChild),
            "ref_in_contrast" => Ok(RefKind::RefInContrast),
            "ref_critical" => Ok(RefKind::RefCritical),
            _ => Err(FromSqlError::InvalidType),
        }
    }
}

// links to decks on the side of notes
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ref {
    pub note_id: Key,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,

    pub id: Key,
    pub title: String,
    pub deck_kind: DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoDeck {
    pub title: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoSlimDeck {
    pub title: String,
    pub deck_kind: DeckKind,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,
}

// Returned as search results
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SlimDeck {
    pub id: Key,
    pub title: String,
    pub deck_kind: DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SlimEvent {
    pub id: Key,
    pub title: String,
    pub deck_kind: DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,

    pub location_textual: Option<String>,

    pub date_textual: Option<String>,
    pub date: Option<chrono::NaiveDate>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hit {
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SlimResults {
    pub results: Vec<SlimDeck>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination<T> {
    pub items: Vec<T>,
    pub total_items: i32,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Arrival {
    pub notes: Vec<Note>,
    pub deck: SlimDeck,
}
