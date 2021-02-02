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
    DeadPool(deadpool_postgres::PoolError),
    DeadPoolConfig(deadpool_postgres::config::ConfigError),
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
    SerdeJson(serde_json::Error),
    ThreadpoolBlocking(actix_threadpool::BlockingError<std::io::Error>),
    TokioPostgres(tokio_postgres::error::Error),
    TokioPostgresMapper(tokio_pg_mapper::Error),
    TooManyFound,
    Utf8(std::str::Utf8Error),
    Var(std::env::VarError),
}

impl ResponseError for Error {
    fn error_response(&self) -> HttpResponse {
        match *self {
            Error::NotFound => HttpResponse::NotFound().finish(),
            Error::DeadPool(ref err) => HttpResponse::InternalServerError().body(err.to_string()),
            _ => HttpResponse::InternalServerError().finish(),
        }
    }
}
