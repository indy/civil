// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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

use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ToSql, ToSqlOutput, ValueRef};

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum Font {
    Serif = 1,
    Sans,
    Cursive,
    AI,
    DeWalpergens,
    Essays1743,
    Hyperlegible,
}

impl From<Font> for i32 {
    fn from(font: Font) -> i32 {
        match font {
            Font::Serif => 1,
            Font::Sans => 2,
            Font::Cursive => 3,
            Font::AI => 4,
            Font::DeWalpergens => 5,
            Font::Essays1743 => 6,
            Font::Hyperlegible => 7,
        }
    }
}

impl FromSql for Font {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let i = value.as_i64()?;
        match i {
            1 => Ok(Font::Serif),
            2 => Ok(Font::Sans),
            3 => Ok(Font::Cursive),
            4 => Ok(Font::AI),
            5 => Ok(Font::DeWalpergens),
            6 => Ok(Font::Essays1743),
            7 => Ok(Font::Hyperlegible),
            _ => Err(FromSqlError::OutOfRange(i)),
        }
    }
}

impl ToSql for Font {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        Ok(ToSqlOutput::from(i32::from(*self)))
    }
}
