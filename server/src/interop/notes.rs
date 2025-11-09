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
use crate::interop::decks::Ref;
use crate::interop::font::Font;
use crate::interop::memorise::FlashCard;

use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ValueRef};

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum NoteKind {
    Note = 1,
    NoteReview,
    NoteSummary,
    NoteDeckMeta,
}

impl From<NoteKind> for i32 {
    fn from(note_kind: NoteKind) -> i32 {
        match note_kind {
            NoteKind::Note => 1,
            NoteKind::NoteReview => 2,
            NoteKind::NoteSummary => 3,
            NoteKind::NoteDeckMeta => 4,
        }
    }
}

impl FromSql for NoteKind {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let i = value.as_i64()?;
        match i {
            1 => Ok(NoteKind::Note),
            2 => Ok(NoteKind::NoteReview),
            3 => Ok(NoteKind::NoteSummary),
            4 => Ok(NoteKind::NoteDeckMeta),
            _ => Err(FromSqlError::OutOfRange(i)),
        }
    }
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: Key,
    pub prev_note_id: Option<Key>,
    pub kind: NoteKind,
    pub content: String,
    pub point_id: Option<Key>,
    pub font: Font,

    pub refs: Vec<Ref>,
    pub flashcards: Vec<FlashCard>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoNote {
    pub kind: NoteKind,
    pub font: Font,
    pub content: Vec<String>,
    pub deck_id: Key,
    pub point_id: Option<Key>,
    pub prev_note_id: Option<Key>,
    pub next_note_id: Option<Key>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewNotes {
    pub deck_id: Key,
    pub notes: Vec<Note>,
}
