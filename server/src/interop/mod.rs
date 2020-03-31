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

pub mod articles;
pub mod autocomplete;
pub mod books;
pub mod dates;
pub mod decks;
pub mod edges;
pub mod historic_people;
pub mod historic_points;
pub mod locations;
pub mod notes;
pub mod subjects;
pub mod tags;
pub mod users;

use crate::error::{Error, Result};
use std::fmt;

pub type Key = i64;

#[derive(serde::Deserialize)]
pub struct IdParam {
    pub id: Key,
}

#[derive(Clone, Copy, Debug)]
pub enum Model {
    Note,
    HistoricPerson,
    Subject,
    Article,
    Book,
    HistoricPoint,
    Date,
    Location,
    Edge,
    Timespan,
}

impl std::fmt::Display for Model {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Model::Note => write!(f, "Mode::Note"),
            Model::HistoricPerson => write!(f, "Model::HistoricPerson"),
            Model::Subject => write!(f, "Mode::Subject"),
            Model::Article => write!(f, "Mode::Article"),
            Model::Book => write!(f, "Model::Book"),
            Model::HistoricPoint => write!(f, "Model::HistoricPoint"),
            Model::Date => write!(f, "Mode::Date"),
            Model::Location => write!(f, "Model::Location"),
            Model::Edge => write!(f, "Model::Edge"),
            Model::Timespan => write!(f, "Model::Timespan"),
        }
    }
}

pub(crate) fn model_to_deck_kind(model: Model) -> Result<&'static str> {
    match model {
        Model::Note => Ok("note"),
        Model::HistoricPerson => Ok("historic_person"),
        Model::Subject => Ok("subject"),
        Model::Article => Ok("article"),
        Model::Book => Ok("book"),
        Model::HistoricPoint => Ok("historic_point"),
        _ => Err(Error::ModelConversion),
    }
}

pub(crate) fn model_to_table_name(model: Model) -> Result<&'static str> {
    match model {
        Model::Note => Ok("notes"),
        Model::Date => Ok("dates"),
        Model::Location => Ok("locations"),
        Model::Timespan => Ok("timespans"),
        Model::Edge => Ok("edges"),
        _ => Err(Error::ModelNonUniqueTableName),
    }
}
