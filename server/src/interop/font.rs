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
    FrenchCanon,
    English,
    DeWalpergens,
    DoublePica,
    GreatPrimer,
    ThreeLinesPica,
}

impl From<Font> for i32 {
    fn from(font: Font) -> i32 {
        match font {
            Font::Serif => 1,
            Font::Sans => 2,
            Font::Cursive => 3,
            Font::AI => 4,
            Font::FrenchCanon => 5,
            Font::English => 6,
            Font::DeWalpergens => 7,
            Font::DoublePica => 8,
            Font::GreatPrimer => 9,
            Font::ThreeLinesPica => 10,
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
            5 => Ok(Font::FrenchCanon),
            6 => Ok(Font::English),
            7 => Ok(Font::DeWalpergens),
            8 => Ok(Font::DoublePica),
            9 => Ok(Font::GreatPrimer),
            10 => Ok(Font::ThreeLinesPica),
            _ => Err(Error::IntConversionToEnum),
        }
    }
}
