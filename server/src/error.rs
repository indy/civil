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

use actix_web::{HttpResponse, ResponseError};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Actix(#[from] actix_web::Error),
    #[error(transparent)]
    Argon2(#[from] argon2::Error),
    #[error("authenticating failed")]
    Authenticating,
    #[error(transparent)]
    ChatGPTError(#[from] chatgpt::err::Error),
    #[error(transparent)]
    CivilShared(#[from] civil_shared::Error),
    #[error("external server error")]
    ExternalServerError,
    #[error(transparent)]
    IO(#[from] std::io::Error),
    #[error("invalid kind")]
    InvalidKind,
    #[error("invalid resource")]
    InvalidResource,
    #[error("missing id")]
    MissingId,
    #[error("not found")]
    NotFound,
    #[error("other error")]
    Other,
    #[error(transparent)]
    ParseInt(#[from] std::num::ParseIntError),
    #[error("radix conversion error")]
    RadixConversion,
    #[error("registration error")]
    Registration,
    #[error(transparent)]
    ThreadpoolBlocking(#[from] actix_threadpool::BlockingError<std::io::Error>),
    #[error(transparent)]
    ActixWebBlocking(#[from] actix_web::error::BlockingError),
    #[error("too many found")]
    TooManyFound,
    #[error(transparent)]
    Utf8(#[from] std::str::Utf8Error),
    #[error(transparent)]
    Var(#[from] std::env::VarError),
    #[error("int conversion to enum")]
    IntConversionToEnum,
    #[error(transparent)]
    SessionGetError(#[from] actix_session::SessionGetError),
    #[error(transparent)]
    SessionInsertError(#[from] actix_session::SessionInsertError),
    #[error("string conversion to enum")]
    StringConversionToEnum,
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    SqliteMigration(#[from] rusqlite_migration::Error),
    #[error(transparent)]
    SqlitePool(#[from] r2d2::Error),
    #[error("sqlite string conversion error")]
    SqliteStringConversion,
    #[error(transparent)]
    Db(#[from] crate::db::DbError),
}

impl ResponseError for Error {
    fn error_response(&self) -> HttpResponse {
        match *self {
            Error::NotFound => HttpResponse::NotFound().finish(),
            _ => HttpResponse::InternalServerError().finish(),
        }
    }
}

pub(crate) fn display_local_backtrace() {
    tracing::error!("backtrace:");

    let mut depth = 0;

    backtrace::trace(|frame| {
        backtrace::resolve_frame(frame, |symbol| {
            if let Some(name) = symbol.name() {
                if name.to_string().starts_with("civil_server") {
                    // ignore the first entry on the stack since that's the call to display_local_backtrace
                    if depth > 0 {
                        tracing::error!("{}", name);
                    }
                    depth += 1;
                }
            }
        });

        true // keep going to the next frame
    });
}
