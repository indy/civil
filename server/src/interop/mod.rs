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

pub mod autocomplete;
pub mod decks;
pub mod edges;
pub mod events;
pub mod ideas;
pub mod notes;
pub mod people;
pub mod points;
pub mod publications;
pub mod users;
pub mod uploader;

use std::fmt;

pub type Key = i64;

#[derive(serde::Deserialize)]
pub struct IdParam {
    pub id: Key,
}

#[derive(Clone, Copy, Debug)]
pub enum Model {
    Event,
    Idea,
    Note,
    Person,
    Point,
    Publication,
}

impl std::fmt::Display for Model {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Model::Event => write!(f, "Model::Event"),
            Model::Idea => write!(f, "Model::Idea"),
            Model::Note => write!(f, "Mode::Note"),
            Model::Person => write!(f, "Model::Person"),
            Model::Point => write!(f, "Mode::Point"),
            Model::Publication => write!(f, "Mode::Publication"),
        }
    }
}
