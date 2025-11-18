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

pub mod articles;
pub mod bookmarks;
pub mod concepts;
pub mod decks;
pub mod dialogues;
pub mod events;
pub mod graph;
pub mod ideas;
pub mod memorise;
pub mod notes;
pub mod people;
pub mod points;
pub mod predictions;
pub mod quotes;
pub mod references;
pub mod search;
pub mod stats;
pub mod timelines;
pub mod uploader;
pub mod users;

pub mod sqlite;
pub mod sqlite_migrations;

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
pub(crate) type SqlitePool = Pool<SqliteConnectionManager>;

// the reason for a separate error type for db stuff is that the crate level Error isn't Send + 'static,
// so we can't pass it through the blocking closure.

#[derive(thiserror::Error, Debug)]
pub enum DbError {
    #[error(transparent)]
    Pool(#[from] r2d2::Error),
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    Join(#[from] tokio::task::JoinError),
    #[error("Too Many Found")]
    TooManyFound,
    #[error("String Conversion To Enum")]
    StringConversionToEnum,
}

// Blocking helper: only DbError crosses the thread boundary.
pub async fn db_thread<T, F>(pool: &SqlitePool, f: F) -> crate::Result<T>
where
    F: FnOnce(&mut rusqlite::Connection) -> Result<T, DbError> + Send + 'static,
    T: Send + 'static,
{
    let pool = pool.clone();

    Ok(
        tokio::task::spawn_blocking(move || {
            let mut conn = pool.get()?; // r2d2::Error -> DbError via `From`
            f(&mut conn)                // Result<T, DbError>
        })
        .await? // JoinError -> Error via `From`  -- this is a DBError
        ?, // DbError  -> Error via `From`   -- this converts the DBError into crate::Result
    )
}

fn sanitize_for_sqlite_match(s: String) -> Result<String, DbError> {
    let res: String = s
        .chars()
        .map(|x| match x {
            '?' => ' ',
            '>' => ' ',
            '<' => ' ',
            '+' => ' ',
            '-' => ' ',
            '/' => ' ',
            '*' => ' ',
            '%' => ' ',
            '!' => ' ',
            '(' => ' ',
            ')' => ' ',
            ',' => ' ',
            '.' => ' ',
            ':' => ' ',
            '&' => ' ',
            '`' => ' ',
            '\\' => ' ',
            '\'' => ' ',
            _ => x,
        })
        .collect();

    Ok(res)
}
