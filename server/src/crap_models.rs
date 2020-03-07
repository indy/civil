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

use crate::error::{Error, Result};
use tokio_postgres::types::{IsNull, ToSql, Type, to_sql_checked};
use bytes::{BytesMut, BufMut};
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

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NoteType {
    Note = 1,
    Quote = 2,
}

#[derive(Debug, Clone, Copy)]
pub enum EdgeType {
    NoteToNote = 11,
    NoteToHistoricPerson = 12,
    NoteToSubject = 13,
    NoteToArticle = 14,
    NoteToHistoricPoint = 15,

    HistoricPersonToNote = 21,
    HistoricPersonToHistoricPerson = 22,
    HistoricPersonToSubject = 23,
    HistoricPersonToArticle = 24,
    HistoricPersonToHistoricPoint = 25,

    SubjectToNote = 31,
    SubjectToHistoricPerson = 32,
    SubjectToSubject = 33,
    SubjectToArticle = 34,
    SubjectToHistoricPoint = 35,

    ArticleToNote = 41,
    ArticleToHistoricPerson = 42,
    ArticleToSubject = 43,
    ArticleToArticle = 44,
    ArticleToHistoricPoint = 45,

    HistoricPointToNote = 51,
    HistoricPointToHistoricPerson = 52,
    HistoricPointToSubject = 53,
    HistoricPointToArticle = 54,
    HistoricPointToHistoricPoint = 55,
}

pub fn edgetype_for_model_to_note(model: Model) -> Result<EdgeType> {
    match model {
        Model::Note => Ok(EdgeType::NoteToNote),
        Model::HistoricPerson => Ok(EdgeType::HistoricPersonToNote),
        Model::Subject => Ok(EdgeType::SubjectToNote),
        Model::Article => Ok(EdgeType::ArticleToNote),
        Model::HistoricPoint => Ok(EdgeType::HistoricPointToNote),
        _ => Err(Error::InvalidModelType(model)),
    }
}

pub fn edgetype_for_note_to_model(model: Model) -> Result<EdgeType> {
    match model {
        Model::Note => Ok(EdgeType::NoteToNote),
        Model::HistoricPerson => Ok(EdgeType::NoteToHistoricPerson),
        Model::Subject => Ok(EdgeType::NoteToSubject),
        Model::Article => Ok(EdgeType::NoteToArticle),
        Model::HistoricPoint => Ok(EdgeType::NoteToHistoricPoint),
        _ => Err(Error::InvalidModelType(model)),
    }
}

impl ToSql for NoteType {
    fn to_sql(
        &self,
        _ty: &Type,
        out: &mut BytesMut,
    ) -> ::std::result::Result<IsNull, Box<dyn ::std::error::Error + Sync + Send>> {
        out.put_i32(*self as i32);
        Ok(IsNull::No)
    }

    fn accepts(ty: &Type) -> bool {
        <i32 as ToSql>::accepts(ty)
    }

    to_sql_checked!();
}

impl ToSql for EdgeType {
    fn to_sql(
        &self,
        _ty: &Type,
        out: &mut BytesMut,
    ) -> ::std::result::Result<IsNull, Box<dyn ::std::error::Error + Sync + Send>> {
        out.put_i32(*self as i32);
        Ok(IsNull::No)
    }

    fn accepts(ty: &Type) -> bool {
        <i32 as ToSql>::accepts(ty)
    }

    to_sql_checked!();
}
