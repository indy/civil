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

use crate::interop::decks as interop;
use postgres_types::{FromSql, ToSql};
use serde::{Deserialize, Serialize};
use crate::error::{Error, Result};

#[derive(Clone, Debug, ToSql, FromSql, Deserialize, Serialize, PartialEq)]
#[postgres(name = "ref_kind")]
pub enum RefKind {
    #[postgres(name = "ref")]
    Ref,
    #[postgres(name = "ref_to_parent")]
    RefToParent,
    #[postgres(name = "ref_to_child")]
    RefToChild,
    #[postgres(name = "ref_in_contrast")]
    RefInContrast,
    #[postgres(name = "ref_critical")]
    RefCritical,
}

// --------------------------------------------------------------------------------
// ------------------------------------ Sqlite   ----------------------------------
// --------------------------------------------------------------------------------

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

impl From<RefKind> for interop::RefKind {
    fn from(a: RefKind) -> interop::RefKind {
        match a {
            RefKind::Ref => interop::RefKind::Ref,
            RefKind::RefToParent => interop::RefKind::RefToParent,
            RefKind::RefToChild => interop::RefKind::RefToChild,
            RefKind::RefInContrast => interop::RefKind::RefInContrast,
            RefKind::RefCritical => interop::RefKind::RefCritical,
        }
    }
}

impl From<interop::RefKind> for RefKind {
    fn from(a: interop::RefKind) -> RefKind {
        match a {
            interop::RefKind::Ref => RefKind::Ref,
            interop::RefKind::RefToParent => RefKind::RefToParent,
            interop::RefKind::RefToChild => RefKind::RefToChild,
            interop::RefKind::RefInContrast => RefKind::RefInContrast,
            interop::RefKind::RefCritical => RefKind::RefCritical,
        }
    }
}
