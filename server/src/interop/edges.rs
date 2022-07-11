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

use crate::interop::decks::{DeckKind, RefKind};
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ExistingReference {
    pub id: Key, // id of the existing deck
    pub name: String,
    pub resource: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct NewReference {
    pub name: String,
    pub resource: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoNoteReferences {
    pub note_id: Key,
    pub references_added: Vec<ExistingReference>,
    pub references_changed: Vec<ExistingReference>,
    pub references_created: Vec<NewReference>,
    pub references_removed: Vec<ExistingReference>,
}
