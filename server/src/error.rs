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
use derive_more::{Display, From};
use tracing::error;

pub type Result<T> = ::std::result::Result<T, Error>;

#[derive(Display, From, Debug)]
pub enum Error {
    Actix(actix_web::Error),
    Argon2(argon2::Error),
    Authenticating,
    ChatGPTError(chatgpt::err::Error),
    CivilShared(civil_shared::Error),
    IO(std::io::Error),
    InvalidKind,
    InvalidResource,
    MissingId,
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
    IntConversionToEnum,
    SessionGetError(actix_session::SessionGetError),
    SessionInsertError(actix_session::SessionInsertError),
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

pub(crate) fn display_local_backtrace() {
    error!("backtrace:");

    let mut depth = 0;

    backtrace::trace(|frame| {
        backtrace::resolve_frame(frame, |symbol| {
            if let Some(name) = symbol.name() {
                if name.to_string().starts_with("civil_server") {
                    // ignore the first entry on the stack since that's the call to display_local_backtrace
                    if depth > 0 {
                        error!("{}", name);
                    }
                    depth += 1;
                }
            }
        });

        true // keep going to the next frame
    });
}
