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

use crate::error::{Error, Result};
use crate::interop::Key;

#[derive(PartialEq, Copy, Clone, Debug, serde::Deserialize, serde::Serialize)]
pub enum DeckKind {
    #[serde(rename = "articles")]
    Article,
    #[serde(rename = "people")]
    Person,
    #[serde(rename = "ideas")]
    Idea,
    #[serde(rename = "timelines")]
    Timeline,
    #[serde(rename = "quotes")]
    Quote,
}

pub(crate) fn deck_kind_from_sqlite_string(s: &str) -> Result<DeckKind> {
    if s == "article" {
        Ok(DeckKind::Article)
    } else if s == "person" {
        Ok(DeckKind::Person)
    } else if s == "idea" {
        Ok(DeckKind::Idea)
    } else if s == "timeline" {
        Ok(DeckKind::Timeline)
    } else if s == "quote" {
        Ok(DeckKind::Quote)
    } else {
        Err(Error::SqliteStringConversion)
    }
}

pub(crate) fn sqlite_string_from_deck_kind(deckkind: DeckKind) -> &'static str {
    match deckkind {
        DeckKind::Article => "article",
        DeckKind::Person => "person",
        DeckKind::Idea => "idea",
        DeckKind::Timeline => "timeline",
        DeckKind::Quote => "quote",
    }
}

#[derive(Copy, Clone, Debug, serde::Deserialize, serde::Serialize)]
pub enum RefKind {
    Ref,
    RefToParent,
    RefToChild,
    RefInContrast,
    RefCritical,
}

pub(crate) fn ref_kind_from_sqlite_string(s: &str) -> Result<RefKind> {
    if s == "ref" {
        Ok(RefKind::Ref)
    } else if s == "ref_to_parent" {
        Ok(RefKind::RefToParent)
    } else if s == "ref_to_child" {
        Ok(RefKind::RefToChild)
    } else if s == "ref_in_contrast" {
        Ok(RefKind::RefInContrast)
    } else if s == "ref_critical" {
        Ok(RefKind::RefCritical)
    } else {
        Err(Error::SqliteStringConversion)
    }
}

pub(crate) fn sqlite_string_from_ref_kind(rk: RefKind) -> Result<String> {
    match rk {
        RefKind::Ref => Ok(String::from("ref")),
        RefKind::RefToParent => Ok(String::from("ref_to_parent")),
        RefKind::RefToChild => Ok(String::from("ref_to_child")),
        RefKind::RefInContrast => Ok(String::from("ref_in_contrast")),
        RefKind::RefCritical => Ok(String::from("ref_critical")),
    }
}

// links to decks on the side of notes
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Ref {
    pub note_id: Key,
    pub id: Key,
    pub name: String,
    pub resource: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

// notes that have references back to the currently displayed deck
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct BackNote {
    pub note_id: Key,
    pub note_content: String,
    pub deck_id: Key,
    pub deck_name: String,
    pub resource: DeckKind,
}

// all refs on notes that have at least one ref back to the currently displayed deck
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct BackRef {
    pub note_id: Key,
    pub deck_id: Key,
    pub deck_name: String,
    pub resource: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

// Returned as search results
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeckSimple {
    pub id: Key,
    pub name: String,
    pub resource: DeckKind,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ResultList {
    pub results: Vec<DeckSimple>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SearchResults {
    pub results: Option<Vec<DeckSimple>>,
}
