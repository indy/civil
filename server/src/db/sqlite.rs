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

#[allow(unused_imports)]
use crate::error::{display_local_backtrace, Error};
#[allow(unused_imports)]
use rusqlite::{Connection, Row, ToSql};
#[allow(unused_imports)]
use tracing::error;

pub(crate) type SqlitePool = r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>;

pub(crate) trait FromRow {
    fn from_row(row: &Row) -> crate::Result<Self>
    where
        Self: Sized;
}

impl FromRow for i32 {
    fn from_row(row: &Row) -> crate::Result<i32> {
        Ok(row.get(0)?)
    }
}

impl FromRow for Key {
    fn from_row(row: &Row) -> crate::Result<Key> {
        Ok(row.get(0)?)
    }
}

impl FromRow for Option<Key> {
    fn from_row(row: &Row) -> crate::Result<Option<Key>> {
        Ok(row.get(0)?)
    }
}

impl FromRow for String {
    fn from_row(row: &Row) -> crate::Result<String> {
        Ok(row.get(0)?)
    }
}

impl FromRow for chrono::NaiveDateTime {
    fn from_row(row: &Row) -> crate::Result<chrono::NaiveDateTime> {
        Ok(row.get(0)?)
    }
}

pub(crate) fn zero(conn: &Connection, sql: &str, params: &[&dyn ToSql]) -> crate::Result<()> {
    match conn.execute(sql, params) {
        Ok(_) => Ok(()),
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            Err(Error::Sqlite(e))
        }
    }
}

pub(crate) fn one<T: FromRow>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
) -> crate::Result<T> {
    let mut stmt = match conn.prepare_cached(sql) {
        Ok(st) => st,
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            return Err(Error::Sqlite(e));
        }
    };
    let mut rows = stmt.query(params)?;
    if let Some(row) = match rows.next() {
        Ok(r) => r,
        Err(e) => {
            error!("row.next error in query: {}", sql);
            display_local_backtrace();
            return Err(Error::Sqlite(e));
        }
    } {
        let res: T = match FromRow::from_row(row) {
            Ok(r) => r,
            Err(e) => {
                error!("from_row error in query: {}", sql);
                error!("{:?}", &e);
                return Err(e);
            }
        };
        Ok(res)
    } else {
        Err(crate::Error::NotFound)
    }
}

pub(crate) fn many<T: FromRow>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
) -> crate::Result<Vec<T>> {
    let mut stmt = match conn.prepare_cached(sql) {
        Ok(st) => st,
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            return Err(Error::Sqlite(e));
        }
    };

    let mut rows = stmt.query(params)?;
    let mut res_vec = Vec::new();

    while let Some(row) = match rows.next() {
        Ok(r) => r,
        Err(e) => {
            error!("row.next error in query: {}", sql);
            display_local_backtrace();
            return Err(Error::Sqlite(e));
        }
    } {
        let res: T = match FromRow::from_row(row) {
            Ok(r) => r,
            Err(e) => {
                error!("from_row error in query: {}", sql);
                error!("{:?}", &e);
                return Err(e);
            }
        };

        res_vec.push(res);
    }

    Ok(res_vec)
}
