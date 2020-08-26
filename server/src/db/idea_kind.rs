// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

use crate::interop::ideas as interop;
use postgres_types::{FromSql, ToSql};
use serde::{Deserialize, Serialize};

// this is the postgres specific enum of IdeaKind that will need to be
// converted into interop::IdeaKind when creating interop::Idea
//
#[derive(Clone, Debug, ToSql, FromSql, Serialize, Deserialize)]
#[postgres(name = "idea_kind")]
pub enum IdeaKind {
    #[postgres(name = "idea_na")]
    NA,
    #[postgres(name = "idea_verbatim")]
    Verbatim,
    #[postgres(name = "idea_insight")]
    Insight,
}

impl From<IdeaKind> for interop::IdeaKind {
    fn from(a: IdeaKind) -> interop::IdeaKind {
        match a {
            IdeaKind::NA => interop::IdeaKind::NA,
            IdeaKind::Verbatim => interop::IdeaKind::Verbatim,
            IdeaKind::Insight => interop::IdeaKind::Insight,
        }
    }
}

impl From<interop::IdeaKind> for IdeaKind {
    fn from(a: interop::IdeaKind) -> IdeaKind {
        match a {
            interop::IdeaKind::NA => IdeaKind::NA,
            interop::IdeaKind::Verbatim => IdeaKind::Verbatim,
            interop::IdeaKind::Insight => IdeaKind::Insight,
        }
    }
}
