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
            password.to_string(),
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

pub fn sqlite_get_all_user_ids(sqlite_pool: &SqlitePool) -> Result<Vec<interop::UserId>> {
    fn from_row(row: &Row) -> Result<interop::UserId> {
        Ok(interop::UserId {
            id: row.get(0)?,
        })
    }

    let conn = sqlite_pool.get()?;
    sqlite::many(
        &conn,
        "SELECT id
         FROM users",
        &[],
        from_row
    )
}


// --------------------------------------------------------------------------------
// ------------------------------------ Postgres ----------------------------------
// --------------------------------------------------------------------------------

use super::pg;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;


#[derive(Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "users")]
struct User {
    id: Key,
    email: String,
    username: String,
    password: String,
}

impl From<User> for interop::User {
    fn from(user: User) -> interop::User {
        interop::User {
            username: user.username,
            email: user.email,
            admin: None,
        }
    }
}

impl From<User> for interop::UserId {
    fn from(user: User) -> interop::UserId {
        interop::UserId { id: user.id }
    }
}

pub async fn get_all_user_ids(db_pool: &Pool) -> Result<Vec<interop::UserId>> {
    pg::many_from::<User, interop::UserId>(
        db_pool,
        "SELECT $table_fields
         FROM users",
        &[],
    )
    .await
}


// pub(crate) async fn login(
//     db_pool: &Pool,
//     login_credentials: &interop::LoginCredentials,
// ) -> Result<(Key, String, interop::User)> {
//     let db_user = pg::one_non_transactional::<User>(
//         db_pool,
//         "SELECT $table_fields
//          FROM users
//          WHERE email = $1",
//         &[&login_credentials.email],
//     )
//     .await?;

//     let password = String::from(&db_user.password);

//     Ok((db_user.id, password, interop::User::from(db_user)))
// }

// pub(crate) async fn create(
//     db_pool: &Pool,
//     registration: &interop::Registration,
//     hash: &str,
// ) -> Result<(Key, interop::User)> {
//     let db_user = pg::one_non_transactional::<User>(
//         db_pool,
//         "INSERT INTO users ( username, email, password )
//          VALUES ( $1, $2, $3 )
//          RETURNING $table_fields",
//         &[&registration.username, &registration.email, &hash],
//     )
//     .await?;

//     Ok((db_user.id, interop::User::from(db_user)))
// }

// pub(crate) async fn get(db_pool: &Pool, user_id: Key) -> Result<interop::User> {
//     pg::one_from::<User, interop::User>(
//         db_pool,
//         "SELECT $table_fields
//          FROM users
//          WHERE id = $1",
//         &[&user_id],
//     )
//     .await
// }
