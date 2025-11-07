// Copyright (C) 2022 Inderjit Gill <email@indy.io>

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

use crate::interop::Key;

use crate::db::DbError;

#[allow(unused_imports)]
use crate::error::{display_local_backtrace, Error};
#[allow(unused_imports)]
use rusqlite::{Connection, OptionalExtension, Row, ToSql};
#[allow(unused_imports)]
use tracing::error;

pub(crate) trait FromRow {
    fn from_row(row: &Row) -> rusqlite::Result<Self>
    where
        Self: Sized;
}

impl FromRow for i32 {
    fn from_row(row: &Row) -> rusqlite::Result<i32> {
        Ok(row.get(0)?)
    }
}

impl FromRow for Key {
    fn from_row(row: &Row) -> rusqlite::Result<Key> {
        Ok(row.get(0)?)
    }
}

impl FromRow for Option<Key> {
    fn from_row(row: &Row) -> rusqlite::Result<Option<Key>> {
        Ok(row.get(0)?)
    }
}

impl FromRow for String {
    fn from_row(row: &Row) -> rusqlite::Result<String> {
        Ok(row.get(0)?)
    }
}

impl FromRow for chrono::NaiveDateTime {
    fn from_row(row: &Row) -> rusqlite::Result<chrono::NaiveDateTime> {
        Ok(row.get(0)?)
    }
}

pub(crate) fn zero(conn: &Connection, sql: &str, params: &[&dyn ToSql]) -> Result<(), DbError> {
    match conn.execute(sql, params) {
        Ok(_) => Ok(()),
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            Err(DbError::Sqlite(e))
        }
    }
}

pub(crate) fn one<T: FromRow>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
) -> Result<T, DbError> {
    let mut stmt = conn.prepare_cached(sql).map_err(|e| {
        error!("{}", sql);
        error!("{:?}", e);
        DbError::Sqlite(e)
    })?;

    stmt.query_row(params, |row| T::from_row(row))
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => DbError::NotFound,
            other => {
                error!("query_row error in query: {}", sql);
                error!("{:?}", &other);
                DbError::Sqlite(other)
            }
        })
}

pub(crate) fn one_optional<T: FromRow>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
) -> Result<Option<T>, DbError> {
    let mut stmt = conn.prepare_cached(sql).map_err(|e| {
        error!("{}", sql);
        error!("{:?}", e);
        DbError::Sqlite(e)
    })?;

    match stmt.query_row(params, |row| T::from_row(row)) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => {
            error!("query_row error in query: {}", sql);
            error!("{:?}", &e);
            Err(DbError::Sqlite(e))
        }
    }
}

pub(crate) fn many<T: FromRow>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
) -> Result<Vec<T>, DbError> {
    let mut stmt = match conn.prepare_cached(sql) {
        Ok(st) => st,
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            return Err(DbError::Sqlite(e));
        }
    };

    let mut rows = stmt.query(params)?;
    let mut res_vec = Vec::new();

    while let Some(row) = match rows.next() {
        Ok(r) => r,
        Err(e) => {
            error!("row.next error in query: {}", sql);
            display_local_backtrace();
            return Err(DbError::Sqlite(e));
        }
    } {
        let res: T = match FromRow::from_row(row) {
            Ok(r) => r,
            Err(e) => {
                error!("from_row error in query: {}", sql);
                error!("{:?}", &e);
                return Err(DbError::Sqlite(e));
            }
        };

        res_vec.push(res);
    }

    Ok(res_vec)
}
