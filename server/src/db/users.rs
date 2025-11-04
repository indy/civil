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

use crate::db::{SqlitePool, DbError, db};
use crate::db::sqlite::{self, FromRow};
use crate::interop::users::{LoginCredentials, Registration, User, UserId};
use crate::interop::Key;
use rusqlite::{params, OptionalExtension, Row};
use tracing::info;

// used by login
impl FromRow for (Key, String, User) {
    fn from_row(row: &Row) -> crate::Result<(Key, String, User)> {
        let id: Key = row.get(0)?;
        let password: String = row.get(3)?;

        Ok((
            id,
            password,
            User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
                ui_config_json: row.get(4)?,
            },
        ))
    }

    fn from_row_conn(row: &Row) -> Result<(Key, String, User), DbError> {
        let id: Key = row.get(0)?;
        let password: String = row.get(3)?;

        Ok((
            id,
            password,
            User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
                ui_config_json: row.get(4)?,
            },
        ))
    }
}

pub(crate) fn login(
    sqlite_pool: &SqlitePool,
    login_credentials: &LoginCredentials,
) -> crate::Result<(Key, String, User)> {
    let email = login_credentials.email.trim();

    let conn = sqlite_pool.get()?;
    sqlite::one(
        &conn,
        r#"
           select id, email, username, password, ui_config_json
           from users
           where email = ?1
        "#,
        params![email],
    )
}

// used by create
impl FromRow for (Key, User) {
    fn from_row(row: &Row) -> crate::Result<(Key, User)> {
        let id: Key = row.get(0)?;

        Ok((
            id,
            User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
                ui_config_json: row.get(3)?,
            },
        ))
    }

    fn from_row_conn(row: &Row) -> Result<(Key, User), DbError> {
        let id: Key = row.get(0)?;

        Ok((
            id,
            User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
                ui_config_json: row.get(3)?,
            },
        ))
    }
}

pub(crate) fn create(
    sqlite_pool: &SqlitePool,
    registration: &Registration,
    hash: &str,
) -> crate::Result<(Key, User)> {
    info!("create");

    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        r#"
           insert into users (email, username, password, ui_config_json)
           values(?1, ?2, ?3, ?4)
           returning id, email, username, ui_config_json
        "#,
        params![
            registration.email,
            registration.username,
            hash,
            registration.ui_config
        ],
    )
}

fn get_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
) -> Result<Option<User>, DbError> {
    conn.prepare_cached(r#"
           select email, username, ui_config_json
           from users
           where id = ?1
           limit 1
    "#)?
    .query_row(params![user_id], |row| {
        Ok(User {
            username: row.get(1)?,
            email: row.get(0)?,
            admin: None,
            ui_config_json: row.get(2)?,
        })
    })
    .optional()
    .map_err(Into::into)
}

pub(crate) async fn get(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Option<User>> {
    db(sqlite_pool, move |conn| get_conn(conn, user_id))
        .await
        .map_err(|e: DbError| e.into())
}

pub(crate) fn edit_ui_config(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    ui_config_json: &str,
) -> crate::Result<bool> {
    let conn = sqlite_pool.get()?;
    sqlite::zero(
        &conn,
        r#"
           update users
           set ui_config_json = ?2
           where id = ?1
        "#,
        params![user_id, ui_config_json],
    )?;

    Ok(true)
}

impl FromRow for UserId {
    fn from_row(row: &Row) -> crate::Result<UserId> {
        Ok(UserId { id: row.get(0)? })
    }

    fn from_row_conn(row: &Row) -> Result<UserId, DbError> {
        Ok(UserId { id: row.get(0)? })
    }
}

pub fn get_all_user_ids(sqlite_pool: &SqlitePool) -> crate::Result<Vec<UserId>> {
    let conn = sqlite_pool.get()?;
    sqlite::many(
        &conn,
        "SELECT id
         FROM users",
        &[],
    )
}
