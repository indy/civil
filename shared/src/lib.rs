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

#![allow(clippy::excessive_precision)]

mod colour;
mod compiler;
mod element;
mod error;
mod lexer;
mod parser;

use compiler::compile_to_struct;
use lexer::tokenize;
use parser::{parse, Node};

pub use colour::{Hsluv, Rgb};
pub use element::Element;
pub use error::{Error, Result};

// return internal AST representation, useful for splitting given
// markup into logical sections
//
pub fn markup_as_ast(markup: &str) -> Result<Vec<Node>> {
    let tokens = tokenize(markup)?;
    let (_, nodes) = parse(&tokens)?;

    Ok(nodes)
}

// return an AST that's easily convertible into
// HTML/Plain Text/Preact components
//
pub fn markup_as_struct(markup: &str, note_id: usize) -> Result<Vec<Element>> {
    let tokens = tokenize(markup)?;
    let (_, nodes) = parse(&tokens)?;
    let html = compile_to_struct(&nodes, note_id)?;

    Ok(html)
}
