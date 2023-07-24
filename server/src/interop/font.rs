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

use crate::error::Error;
use std::convert::TryFrom;

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum Font {
    Serif = 1,
    Sans,
    Cursive,
    AI,
    Magazine,
    Book,
    OldBook,
}

impl From<Font> for i32 {
    fn from(font: Font) -> i32 {
        match font {
            Font::Serif => 1,
            Font::Sans => 2,
            Font::Cursive => 3,
            Font::AI => 4,
            Font::Magazine => 5,
            Font::Book => 6,
            Font::OldBook => 7,
        }
    }
}

impl TryFrom<i32> for Font {
    type Error = crate::error::Error;
    fn try_from(i: i32) -> crate::Result<Font> {
        match i {
            1 => Ok(Font::Serif),
            2 => Ok(Font::Sans),
            3 => Ok(Font::Cursive),
            4 => Ok(Font::AI),
            5 => Ok(Font::Magazine),
            6 => Ok(Font::Book),
            7 => Ok(Font::OldBook),
            _ => Err(Error::IntConversionToEnum),
        }
    }
}
