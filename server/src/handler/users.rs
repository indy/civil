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

use crate::error::{Error, Result};
use crate::session;
use actix_web::web::{Data, Json};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use rand::{thread_rng, RngCore};
use tracing::info;

mod interop {
    #[derive(Debug, serde::Deserialize)]
    pub struct LoginCredentials {
        pub email: String,
        pub password: String,
    }

    #[derive(serde::Deserialize)]
    pub struct Registration {
        pub username: String,
        pub email: String,
        pub password: String,
    }

    #[derive(serde::Serialize)]
    pub struct User {
        pub username: String,
        pub email: String,
    }
}

pub async fn login(
    login: Json<interop::LoginCredentials>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("login");
    let login = login.into_inner();

    // db statement
    let (id, password, user) = db::login(&db_pool, &login).await?;

    // compare hashed password of matched_user with the given LoginCredentials
    let is_valid_password = verify_encoded(&password, login.password.as_bytes())?;
    if is_valid_password {
        // save id to the session
        session.set(session::AUTH, format!("{}", id))?;

        info!("login accepted!!");
        // send response
        Ok(HttpResponse::Ok().json(user))
    } else {
        info!("login denied");
        session.clear();
        Err(Error::Authenticating)
    }
}

pub async fn logout(_db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    session.clear();
    // todo: what to return when logging out???
    Ok(HttpResponse::Ok().json(true))
}

fn verify_encoded(encoded: &str, pwd: &[u8]) -> Result<bool> {
    let res = argon2::verify_encoded(encoded, pwd)?;

    Ok(res)
}

pub async fn create_user(
    registration: Json<interop::Registration>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> ::std::result::Result<HttpResponse, actix_web::Error> {
    let registration = registration.into_inner();
    let hash = hash_password(&registration.password)?;

    // db statement
    let (id, user) = db::create(&db_pool, &registration, &hash).await?;

    // save id to the session
    session.set(session::AUTH, format!("{}", id))?;

    // send response
    Ok(HttpResponse::Ok().json(user))
}

pub async fn get_user(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_user");
    let user_id = session::user_id(&session)?;
    let user = db::get(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(user))
}

fn generate_random_salt() -> [u8; 16] {
    let mut salt = [0; 16];
    thread_rng().fill_bytes(&mut salt);

    salt
}

fn hash_password(password: &str) -> Result<String> {
    let salt = generate_random_salt();
    let hash = argon2::hash_encoded(password.as_bytes(), &salt, &argon2::Config::default())?;

    Ok(hash)
}

mod db {
    use super::interop;
    use crate::error::Result;
    use crate::interop::Key;
    use crate::pg;
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
            }
        }
    }

    pub async fn login(
        db_pool: &Pool,
        login_credentials: &interop::LoginCredentials,
    ) -> Result<(Key, String, interop::User)> {
        let db_user = pg::one_non_transactional::<User>(
            db_pool,
            include_str!("../sql/users_login.sql"),
            &[&login_credentials.email],
        )
        .await?;

        let password = String::from(&db_user.password);

        Ok((db_user.id, password, interop::User::from(db_user)))
    }

    pub async fn create(
        db_pool: &Pool,
        registration: &interop::Registration,
        hash: &str,
    ) -> Result<(Key, interop::User)> {
        let db_user = pg::one_non_transactional::<User>(
            db_pool,
            include_str!("../sql/users_create.sql"),
            &[&registration.username, &registration.email, &hash],
        )
        .await?;

        Ok((db_user.id, interop::User::from(db_user)))
    }

    pub async fn get(db_pool: &Pool, user_id: Key) -> Result<interop::User> {
        pg::one_from::<User, interop::User>(
            db_pool,
            include_str!("../sql/users_get.sql"),
            &[&user_id],
        )
        .await
    }
}
