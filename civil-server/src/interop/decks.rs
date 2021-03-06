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

#[derive(PartialEq, Copy, Clone, Debug, serde::Deserialize, serde::Serialize)]
pub enum DeckResource {
    #[serde(rename = "publications")]
    Publication,
    #[serde(rename = "people")]
    Person,
    #[serde(rename = "ideas")]
    Idea,
    #[serde(rename = "timelines")]
    Timeline,
}

#[derive(Copy, Clone, Debug, serde::Deserialize, serde::Serialize)]
pub enum RefKind {
    Ref,
    RefToParent,
    RefToChild,
    RefInContrast,
    RefCritical,
}

// links to decks on the side of notes
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Ref {
    pub note_id: Key,
    pub note_content: Option<String>, // filled in when Ref is used as a BackRef
    pub id: Key,
    pub name: String,
    pub resource: DeckResource,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

// Returned as search results
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeckSimple {
    pub id: Key,
    pub name: String,
    pub resource: DeckResource,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Vertex {
    pub from_id: Key,
    pub to_id: Key,
    pub kind: RefKind,
    pub strength: usize,
}
