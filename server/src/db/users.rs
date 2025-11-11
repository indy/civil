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

use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, SqlitePool};
use crate::interop::Key;
use crate::interop::users::{LoginCredentials, Registration, User, UserId};
use rusqlite::{Row, params};
use tracing::info;

impl FromRow for User {
    fn from_row(row: &Row) -> rusqlite::Result<User> {
        Ok(User {
            username: row.get(1)?,
            email: row.get(0)?,
            admin: None,
            ui_config_json: row.get(2)?,
        })
    }
}

// used by create
impl FromRow for (Key, User) {
    fn from_row(row: &Row) -> rusqlite::Result<(Key, User)> {
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

// used by login
impl FromRow for (Key, String, User) {
    fn from_row(row: &Row) -> rusqlite::Result<(Key, String, User)> {
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
    conn: &rusqlite::Connection,
    login_credentials: LoginCredentials,
) -> Result<Option<(Key, String, User)>, DbError> {
    let email = login_credentials.email.trim();
    sqlite::one_optional(
        &conn,
        r#"
           select id, email, username, password, ui_config_json
           from users
           where email = ?1
        "#,
        params![email],
    )
}

pub(crate) fn create(
    conn: &rusqlite::Connection,
    registration: Registration,
    hash: String,
) -> Result<(Key, User), DbError> {
    info!("create");

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

pub(crate) fn get(conn: &rusqlite::Connection, user_id: Key) -> Result<Option<User>, DbError> {
    let stmt = "select email, username, ui_config_json
                from users
                where id = ?1
                limit 1";

    sqlite::one_optional(&conn, stmt, params![user_id])
}

pub(crate) fn edit_ui_config(
    conn: &rusqlite::Connection,
    user_id: Key,
    ui_config_json: String,
) -> Result<bool, DbError> {
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
    fn from_row(row: &Row) -> rusqlite::Result<UserId> {
        Ok(UserId { id: row.get(0)? })
    }
}

pub fn get_all_user_ids(sqlite_pool: &SqlitePool) -> crate::Result<Vec<UserId>> {
    let conn = sqlite_pool.get()?;
    sqlite::many(
        &conn,
        "SELECT id
         FROM users",
        [],
    )
    .map_err(Into::into)
}
