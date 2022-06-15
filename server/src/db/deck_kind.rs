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

// --------------------------------------------------------------------------------
// ------------------------------------ Postgres ----------------------------------
// --------------------------------------------------------------------------------

#[derive(Copy, Clone, Debug, ToSql, FromSql, Deserialize, Serialize, PartialEq)]
#[postgres(name = "deck_kind")]
pub enum DeckKind {
    #[postgres(name = "article")]
    Article,
    #[postgres(name = "person")]
    Person,
    #[postgres(name = "idea")]
    Idea,
    #[postgres(name = "timeline")]
    Timeline,
    #[postgres(name = "quote")]
    Quote,
}

// --------------------------------------------------------------------------------
// ------------------------------------ Sqlite   ----------------------------------
// --------------------------------------------------------------------------------

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

impl From<DeckKind> for interop::DeckResource {
    fn from(a: DeckKind) -> interop::DeckResource {
        match a {
            DeckKind::Article => interop::DeckResource::Article,
            DeckKind::Person => interop::DeckResource::Person,
            DeckKind::Idea => interop::DeckResource::Idea,
            DeckKind::Timeline => interop::DeckResource::Timeline,
            DeckKind::Quote => interop::DeckResource::Quote,
        }
    }
}

impl From<interop::DeckResource> for DeckKind {
    fn from(a: interop::DeckResource) -> DeckKind {
        match a {
            interop::DeckResource::Article => DeckKind::Article,
            interop::DeckResource::Person => DeckKind::Person,
            interop::DeckResource::Idea => DeckKind::Idea,
            interop::DeckResource::Timeline => DeckKind::Timeline,
            interop::DeckResource::Quote => DeckKind::Quote,
        }
    }
}
