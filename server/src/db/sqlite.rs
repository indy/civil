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

#[allow(unused_imports)]
use crate::error::{display_local_backtrace, Error};
#[allow(unused_imports)]
use rusqlite::{Connection, Row, ToSql};
#[allow(unused_imports)]
use tracing::error;

pub type SqlitePool = r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>;

pub(crate) fn i32_from_row(row: &Row) -> crate::Result<i32> {
    Ok(row.get(0)?)
}

pub(crate) fn zero(conn: &Connection, sql: &str, params: &[&dyn ToSql]) -> crate::Result<()> {
    match conn.execute(sql, params) {
        Ok(_) => return Ok(()),
        Err(e) => {
            error!("{}", &sql);
            error!("{:?}", e);
            return Err(Error::Sqlite(e));
        }
    };
}

pub(crate) fn one<T>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
    from_row: fn(&Row) -> crate::Result<T>,
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
            error!("query: {}", sql);
            display_local_backtrace();
            return Err(Error::Sqlite(e));
        }
    } {
        let res: T = from_row(row)?;
        Ok(res)
    } else {
        Err(crate::Error::NotFound)
    }
}

pub(crate) fn many<T>(
    conn: &Connection,
    sql: &str,
    params: &[&dyn ToSql],
    from_row: fn(&Row) -> crate::Result<T>,
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
            error!("query: {}", sql);
            display_local_backtrace();
            return Err(Error::Sqlite(e));
        }
    } {
        let res: T = from_row(row)?;
        res_vec.push(res);
    }

    Ok(res_vec)
}
