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
use crate::model::Model;
use bytes::{BufMut, BytesMut};
use tokio_postgres::types::{to_sql_checked, IsNull, ToSql, Type};

#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
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

pub fn model_to_note(model: Model) -> Result<EdgeType> {
    match model {
        Model::Note => Ok(EdgeType::NoteToNote),
        Model::HistoricPerson => Ok(EdgeType::HistoricPersonToNote),
        Model::Subject => Ok(EdgeType::SubjectToNote),
        Model::Article => Ok(EdgeType::ArticleToNote),
        Model::HistoricPoint => Ok(EdgeType::HistoricPointToNote),
        _ => Err(Error::InvalidModelType(model)),
    }
}

pub fn note_to_model(model: Model) -> Result<EdgeType> {
    match model {
        Model::Note => Ok(EdgeType::NoteToNote),
        Model::HistoricPerson => Ok(EdgeType::NoteToHistoricPerson),
        Model::Subject => Ok(EdgeType::NoteToSubject),
        Model::Article => Ok(EdgeType::NoteToArticle),
        Model::HistoricPoint => Ok(EdgeType::NoteToHistoricPoint),
        _ => Err(Error::InvalidModelType(model)),
    }
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
