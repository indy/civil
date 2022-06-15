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
use crate::interop::sr::{FlashCard, SqliteFlashCard};
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Quote {
    pub id: Key,
    pub title: String,
    pub attribution: String,

    // will always be a single note
    pub notes: Option<Vec<Note>>,

    pub refs: Option<Vec<Ref>>,

    pub backnotes: Option<Vec<BackNote>>,
    pub backrefs: Option<Vec<BackRef>>,

    pub flashcards: Option<Vec<FlashCard>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SqliteQuote {
    pub id: Key,
    pub title: String,
    pub attribution: String,

    // will always be a single note
    pub notes: Option<Vec<Note>>,

    pub refs: Option<Vec<Ref>>,

    pub backnotes: Option<Vec<BackNote>>,
    pub backrefs: Option<Vec<BackRef>>,

    pub flashcards: Option<Vec<SqliteFlashCard>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProtoQuote {
    pub title: String,
    pub text: String,
    pub attribution: String,
}
