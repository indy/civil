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

use crate::interop::Model;
use actix_web::{HttpResponse, ResponseError};
use civil_shared;
use derive_more::{Display, From};

pub type Result<T> = ::std::result::Result<T, Error>;

#[derive(Display, From, Debug)]
pub enum Error {
    Actix(actix_web::Error),
    Argon2(argon2::Error),
    Authenticating,
    CivilShared(civil_shared::Error),
    IO(std::io::Error),
    InvalidKind,
    InvalidModelType(Model),
    InvalidResource,
    MissingField,
    ModelConversion,
    ModelNonUniqueTableName,
    NotFound,
    Other,
    ParseInt(std::num::ParseIntError),
    RadixConversion,
    Registration,
    ThreadpoolBlocking(actix_threadpool::BlockingError<std::io::Error>),
    ActixWebBlocking(actix_web::error::BlockingError),
    TooManyFound,
    Utf8(std::str::Utf8Error),
    Var(std::env::VarError),
    StringConversionToEnum,
    Sqlite(rusqlite::Error),
    SqliteMigration(rusqlite_migration::Error),
    SqlitePool(r2d2::Error),
    SqliteStringConversion,
}

impl ResponseError for Error {
    fn error_response(&self) -> HttpResponse {
        match *self {
            Error::NotFound => HttpResponse::NotFound().finish(),
            _ => HttpResponse::InternalServerError().finish(),
        }
    }
}
