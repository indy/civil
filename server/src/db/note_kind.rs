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

use crate::interop::notes as interop;
use postgres_types::{FromSql, ToSql};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, ToSql, FromSql, Deserialize, Serialize, PartialEq)]
#[postgres(name = "note_kind")]
pub enum NoteKind {
    #[postgres(name = "note")]
    Note,
    #[postgres(name = "note_review")]
    NoteReview,
    #[postgres(name = "note_summary")]
    NoteSummary,
}

impl From<NoteKind> for interop::NoteKind {
    fn from(a: NoteKind) -> interop::NoteKind {
        match a {
            NoteKind::Note => interop::NoteKind::Note,
            NoteKind::NoteReview => interop::NoteKind::NoteReview,
            NoteKind::NoteSummary => interop::NoteKind::NoteSummary,
        }
    }
}

impl From<interop::NoteKind> for NoteKind {
    fn from(a: interop::NoteKind) -> NoteKind {
        match a {
            interop::NoteKind::Note => NoteKind::Note,
            interop::NoteKind::NoteReview => NoteKind::NoteReview,
            interop::NoteKind::NoteSummary => NoteKind::NoteSummary,
        }
    }
}
