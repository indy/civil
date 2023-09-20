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

use crate::interop::decks::{DeckKind, Ref, RefKind, SlimDeck};
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExistingReference {
    pub id: Key, // id of the existing deck
    pub title: String,
    pub deck_kind: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewReference {
    pub title: String,
    pub deck_kind: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferencesDiff {
    pub references_added: Vec<ExistingReference>,
    pub references_changed: Vec<ExistingReference>,
    pub references_created: Vec<NewReference>,
    pub references_removed: Vec<ExistingReference>,
}

// structure returned when user applies references to a note
//
#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferencesApplied {
    pub refs: Vec<Ref>,
    pub recents: Vec<SlimDeck>,
}
