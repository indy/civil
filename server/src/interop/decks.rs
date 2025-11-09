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

use crate::interop::Key;
use crate::interop::font::Font;
use crate::interop::notes::Note;
use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ValueRef};
use std::{fmt, str::FromStr};

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
    Concept,
}

impl DeckKind {
    pub const fn singular(self) -> &'static str {
        match self {
            DeckKind::Article => "article",
            DeckKind::Concept => "concept",
            DeckKind::Dialogue => "dialogue",
            DeckKind::Event => "event",
            DeckKind::Idea => "idea",
            DeckKind::Person => "person",
            DeckKind::Quote => "quote",
            DeckKind::Timeline => "timeline",
        }
    }
}

impl fmt::Display for DeckKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.singular())
    }
}

impl FromStr for DeckKind {
    type Err = crate::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "article" | "articles" => Ok(DeckKind::Article),
            "concept" | "concepts" => Ok(DeckKind::Concept),
            "dialogue" | "dialogues" => Ok(DeckKind::Dialogue),
            "event" | "events" => Ok(DeckKind::Event),
            "idea" | "ideas" => Ok(DeckKind::Idea),
            "person" | "people" => Ok(DeckKind::Person),
            "quote" | "quotes" => Ok(DeckKind::Quote),
            "timeline" | "timelines" => Ok(DeckKind::Timeline),
            _ => Err(crate::Error::InvalidStringToDeckKindConversion),
        }
    }
}

impl FromSql for DeckKind {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let s = value.as_str()?;
        s.parse().map_err(|_| FromSqlError::InvalidType)
    }
}

pub(crate) fn resource_string_to_deck_kind(resource: &str) -> crate::Result<DeckKind> {
    resource.parse()
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
#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
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
