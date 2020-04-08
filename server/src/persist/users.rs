// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

use super::pg;
use crate::error::Result;
use crate::interop::users as interop;
use crate::interop::Key;
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

pub(crate) async fn login(
    db_pool: &Pool,
    login_credentials: &interop::LoginCredentials,
) -> Result<(Key, String, interop::User)> {
    let db_user = pg::one_non_transactional::<User>(
        db_pool,
        include_str!("sql/users_login.sql"),
        &[&login_credentials.email],
    )
    .await?;

    let password = String::from(&db_user.password);

    Ok((db_user.id, password, interop::User::from(db_user)))
}

pub(crate) async fn create(
    db_pool: &Pool,
    registration: &interop::Registration,
    hash: &str,
) -> Result<(Key, interop::User)> {
    let db_user = pg::one_non_transactional::<User>(
        db_pool,
        include_str!("sql/users_create.sql"),
        &[&registration.username, &registration.email, &hash],
    )
    .await?;

    Ok((db_user.id, interop::User::from(db_user)))
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key) -> Result<interop::User> {
    pg::one_from::<User, interop::User>(db_pool, include_str!("sql/users_get.sql"), &[&user_id])
        .await
}
