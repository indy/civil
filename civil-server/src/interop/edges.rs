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

use crate::interop::decks::RefKind;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ExistingDeckReference {
    pub id: Key, // id of the existing deck
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct NewDeckReference {
    pub name: String,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoEdgeFromNoteToDecks {
    pub note_id: Key,
    pub existing_deck_references: Vec<ExistingDeckReference>,
    pub new_deck_references: Vec<NewDeckReference>,
}
