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

mod compiler;
mod error;
mod lexer;
mod parser;
mod splitter;

use compiler::compile;
use lexer::tokenize;
use parser::parse;
use splitter::split;

pub use error::Result;

pub fn build(markup: &str) -> Result<String> {
    let tokens = tokenize(markup)?;
    let nodes = parse(tokens)?;
    let html = compile(&nodes)?;

    Ok(html)
}

pub fn split_markup(markup: &str) -> Result<Vec<String>> {
    split(markup)
}
