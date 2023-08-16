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
use crate::interop::users as interop;
use crate::interop::Key;
use rusqlite::{params, Row};
use tracing::info;

pub(crate) fn login(
    sqlite_pool: &SqlitePool,
    login_credentials: &interop::LoginCredentials,
) -> crate::Result<(Key, String, interop::User)> {
    fn from_row(row: &Row) -> crate::Result<(Key, String, interop::User)> {
        let id: Key = row.get(0)?;
        let password: String = row.get(3)?;

        Ok((
            id,
            password,
            interop::User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
                ui_config_json: row.get(4)?,
            },
        ))
    }

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
        from_row,
    )
}

pub(crate) fn create(
    sqlite_pool: &SqlitePool,
    registration: &interop::Registration,
    hash: &str,
) -> crate::Result<(Key, interop::User)> {
    info!("create");

    let conn = sqlite_pool.get()?;

    fn from_row(row: &Row) -> crate::Result<(Key, interop::User)> {
        let id: Key = row.get(0)?;

        Ok((
            id,
            interop::User {
                username: row.get(2)?,
                email: row.get(1)?,
                admin: None,
                ui_config_json: row.get(3)?,
            },
        ))
    }

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
        from_row,
    )
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<interop::User> {
    fn from_row(row: &Row) -> crate::Result<interop::User> {
        Ok(interop::User {
            username: row.get(1)?,
            email: row.get(0)?,
            admin: None,
            ui_config_json: row.get(2)?,
        })
    }

    let conn = sqlite_pool.get()?;
    sqlite::one(
        &conn,
        r#"
           select email, username, ui_config_json
           from users
           where id = ?1
        "#,
        params![user_id],
        from_row,
    )
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

pub fn get_all_user_ids(sqlite_pool: &SqlitePool) -> crate::Result<Vec<interop::UserId>> {
    fn from_row(row: &Row) -> crate::Result<interop::UserId> {
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
