// Copyright (C) 2019 Inderjit Gill

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use std::fmt;

#[derive(Clone, Copy, Debug)]
pub enum Model {
    Note,
    HistoricPerson,
    Subject,
    Article,
    HistoricPoint,
    Date,
    Location,
    Edge,
}

impl std::fmt::Display for Model {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Model::Note => write!(f, "Mode::Note"),
            Model::HistoricPerson => write!(f, "Model::HistoricPerson"),
            Model::Subject => write!(f, "Mode::Subject"),
            Model::Article => write!(f, "Mode::Article"),
            Model::HistoricPoint => write!(f, "Model::HistoricPoint"),
            Model::Date => write!(f, "Mode::Date"),
            Model::Location => write!(f, "Model::Location"),
            Model::Edge => write!(f, "Model::Edge"),
        }
    }
}

pub fn model_to_foreign_key(model: Model) -> &'static str {
    match model {
        Model::Note => "note_id",
        Model::HistoricPerson => "historic_person_id",
        Model::Subject => "subject_id",
        Model::Article => "article_id",
        Model::HistoricPoint => "historic_point_id",
        // these won't be used?
        Model::Date => "date_id",
        Model::Location => "location_id",
        Model::Edge => "edge_id",
    }
}

#[allow(dead_code)]
pub fn model_to_table_name(model: Model) -> &'static str {
    match model {
        Model::Note => "notes",
        Model::HistoricPerson => "historic_people",
        Model::Subject => "subjects",
        Model::Article => "articles",
        Model::HistoricPoint => "historic_points",
        Model::Date => "dates",
        Model::Location => "locations",
        Model::Edge => "edges",
    }
}
