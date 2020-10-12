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

use crate::interop::points as interop;
use postgres_types::{FromSql, ToSql};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, ToSql, FromSql, Deserialize, Serialize, PartialEq)]
#[postgres(name = "point_kind")]
pub enum PointKind {
    #[postgres(name = "point")]
    Point,
    #[postgres(name = "point_begin")]
    PointBegin,
    #[postgres(name = "point_end")]
    PointEnd,
}

impl From<PointKind> for interop::PointKind {
    fn from(a: PointKind) -> interop::PointKind {
        match a {
            PointKind::Point => interop::PointKind::Point,
            PointKind::PointBegin => interop::PointKind::PointBegin,
            PointKind::PointEnd => interop::PointKind::PointEnd,
        }
    }
}

impl From<interop::PointKind> for PointKind {
    fn from(a: interop::PointKind) -> PointKind {
        match a {
            interop::PointKind::Point => PointKind::Point,
            interop::PointKind::PointBegin => PointKind::PointBegin,
            interop::PointKind::PointEnd => PointKind::PointEnd,
        }
    }
}
