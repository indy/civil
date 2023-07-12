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

use std::error;
use std::fmt;

#[derive(Debug)]
pub enum Error {
    Compiler,
    Lexer,
    Parser,
    ParserExpectedToEatAll,
    FmtError(std::fmt::Error),
    RgbFromHexError,
    ParseIntError(std::num::ParseIntError),
}

impl From<std::fmt::Error> for Error {
    fn from(e: std::fmt::Error) -> Error {
        Error::FmtError(e)
    }
}

impl From<std::num::ParseIntError> for Error {
    fn from(e: std::num::ParseIntError) -> Error {
        Error::ParseIntError(e)
    }
}

// don't need to implement any of the trait's methods
impl error::Error for Error {}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Error::Compiler => write!(f, "civil core: Compiler"),
            Error::Lexer => write!(f, "civil core: Lexer"),
            Error::Parser => write!(f, "civil core: Parser"),
            Error::ParserExpectedToEatAll => write!(f, "civil core: Parser unable to eat all tokens"),
            Error::FmtError(_) => write!(f, "civil core: Fmt error"),
            Error::RgbFromHexError => write!(f, "RGB from Hex error"),
            Error::ParseIntError(_) => write!(f, "ParseIntError"),
        }
    }
}
