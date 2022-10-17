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

use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::users as interop;
use crate::interop::Key;
use rusqlite::{params, Row};
use tracing::info;

pub(crate) fn login(
    sqlite_pool: &SqlitePool,
    login_credentials: &interop::LoginCredentials,
) -> Result<(Key, String, interop::User)> {
    fn from_row(row: &Row) -> Result<(Key, String, interop::User)> {
        let id: Key = row.get(0)?;
        let password: String = row.get(3)?;

        Ok((
            id,
            password,
            interop::User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
            },
        ))
    }

    let conn = sqlite_pool.get()?;
    sqlite::one(
        &conn,
        r#"
           select id, email, username, password
           from users
           where email = ?1
        "#,
        params![login_credentials.email],
        from_row,
    )
}

pub(crate) fn create(
    sqlite_pool: &SqlitePool,
    registration: &interop::Registration,
    hash: &str,
) -> Result<(Key, interop::User)> {
    info!("create");

    let conn = sqlite_pool.get()?;

    fn from_row(row: &Row) -> Result<(Key, interop::User)> {
        let id: Key = row.get(0)?;

        Ok((
            id,
            interop::User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
            },
        ))
    }

    sqlite::one(
        &conn,
        r#"
           insert into users (email, username, password)
           values(?1, ?2, ?3)
           returning id, email, username
        "#,
        params![registration.email, registration.username, hash],
        from_row,
    )
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::User> {
    fn from_row(row: &Row) -> Result<interop::User> {
        Ok(interop::User {
            username: row.get(1)?,
            email: row.get(0)?,
            admin: None,
        })
    }

    let conn = sqlite_pool.get()?;
    sqlite::one(
        &conn,
        r#"
           select email, username
           from users
           where id = ?1
        "#,
        params![user_id],
        from_row,
    )
}

pub fn get_all_user_ids(sqlite_pool: &SqlitePool) -> Result<Vec<interop::UserId>> {
    fn from_row(row: &Row) -> Result<interop::UserId> {
        Ok(interop::UserId { id: row.get(0)? })
    }

    let conn = sqlite_pool.get()?;
    sqlite::many(
        &conn,
        "SELECT id
         FROM users",
        &[],
        from_row,
    )
}
