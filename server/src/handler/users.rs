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

use crate::db::users as db;
use crate::error::{Error, Result};
use crate::interop::users as interop;
use crate::session;
use actix_web::web::{Data, Json};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use rand::{thread_rng, RngCore};
use std::env;

#[allow(unused_imports)]
use tracing::info;

pub async fn login(
    login: Json<interop::LoginCredentials>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("login");
    let login = login.into_inner();

    let (id, password, mut user) = db::login(&db_pool, &login).await?;

    // compare hashed password of matched_user with the given LoginCredentials
    let is_valid_password = verify_encoded(&password, login.password.as_bytes())?;
    if is_valid_password {
        // save id to the session
        session::save_user_id(&session, id)?;

        if id == 1 {
            user.admin = Some(interop::Admin {
                db_name: env::var("POSTGRES_DB")?,
            })
        }

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

    let (id, user) = db::create(&db_pool, &registration, &hash).await?;

    // save id to the session
    session::save_user_id(&session, id)?;

    // send response
    Ok(HttpResponse::Ok().json(user))
}

pub async fn get_user(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_user");

    if let Ok(user_id) = session::user_id(&session) {
        let mut user = db::get(&db_pool, user_id).await?;

        if user_id == 1 {
            user.admin = Some(interop::Admin {
                db_name: env::var("POSTGRES_DB")?,
            })
        }

        Ok(HttpResponse::Ok().json(user))
    } else {
        Ok(HttpResponse::Ok().json(()))
    }
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
