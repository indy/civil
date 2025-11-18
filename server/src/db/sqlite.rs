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

use crate::db::DbError;
use crate::interop::Key;
use rusqlite::{Connection, OptionalExtension, Params, Row};

#[allow(unused_imports)]
use tracing::error;

pub(crate) trait FromRow: Sized {
    fn from_row(row: &Row) -> rusqlite::Result<Self>;
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

pub(crate) fn zero<P: Params>(conn: &Connection, sql: &str, params: P) -> Result<(), DbError> {
    match conn.execute(sql, params) {
        Ok(_) => Ok(()),
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            Err(DbError::Sqlite(e))
        }
    }
}

pub(crate) fn one<T: FromRow, P: Params>(
    conn: &Connection,
    sql: &str,
    params: P,
) -> Result<T, DbError> {
    conn.prepare_cached(sql)
        .and_then(|mut s| s.query_one(params, T::from_row))
        .map_err(DbError::from)
}

pub(crate) fn one_optional<T: FromRow, P: Params>(
    conn: &Connection,
    sql: &str,
    params: P,
) -> Result<Option<T>, DbError> {
    conn.prepare_cached(sql)
        .and_then(|mut s| s.query_one(params, T::from_row).optional())
        .map_err(DbError::from)
}

pub(crate) fn many<T: FromRow, P: Params>(
    conn: &Connection,
    sql: &str,
    params: P,
) -> Result<Vec<T>, DbError> {
    let mut stmt = conn.prepare_cached(sql).map_err(DbError::from)?;
    let mut rows = stmt.query(params).map_err(DbError::from)?;
    let mut v = Vec::new();
    while let Some(row) = rows.next().map_err(DbError::from)? {
        v.push(T::from_row(row).map_err(DbError::from)?);
    }

    Ok(v)
}
