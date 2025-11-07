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

use crate::db::users as db;
use crate::db::SqlitePool;
use crate::error::Error;
use crate::interop::users as interop;
use crate::interop::Key;
use crate::session;
use crate::ServerConfig;
use actix_web::web::{Data, Json};
use actix_web::HttpResponse;
use rand::{rng, RngCore};
use std::env;

#[allow(unused_imports)]
use tracing::info;

pub async fn login(
    login: Json<interop::LoginCredentials>,
    db_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("login");
    let login = login.into_inner();

    let pw: String = login.password.clone();

    let (id, password, mut user) = db::login(&db_pool, login).await?;

    // compare hashed password of matched_user with the given LoginCredentials
    let is_valid_password = verify_encoded(&password, pw.as_bytes())?;
    if is_valid_password {
        // save id to the session
        session::save_user_id(&session, id)?;

        if id == Key(1) {
            user.admin = Some(interop::Admin {
                db_name: env::var("SQLITE_DB")?,
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

pub async fn logout(
    _db_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    session.purge();
    // todo: what to return when logging out???
    Ok(HttpResponse::Ok().json(true))
}

fn verify_encoded(encoded: &str, pwd: &[u8]) -> crate::Result<bool> {
    let res = argon2::verify_encoded(encoded, pwd)?;

    Ok(res)
}

pub async fn create_user(
    registration: Json<interop::Registration>,
    server_config: Data<ServerConfig>,
    db_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create_user");

    let registration = registration.into_inner();

    if server_config.registration_magic_word == registration.magic_word {
        let hash = hash_password(&registration.password)?;

        let (id, mut user) = db::create(&db_pool, registration, hash).await?;

        // save id to the session
        session::save_user_id(&session, id)?;

        if id == Key(1) {
            user.admin = Some(interop::Admin {
                db_name: env::var("SQLITE_DB")?,
            })
        }

        // send response
        Ok(HttpResponse::Ok().json(user))
    } else {
        Err(Error::Registration)
    }
}

pub async fn get_user(
    db_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    // no session → empty JSON, same as before
    let user_id = match session::user_id(&session) {
        Ok(id) => id,
        Err(_) => return Ok(HttpResponse::Ok().json(())),
    };

    // fetch from DB (async, runs on blocking thread internally)
    let mut user = match db::get(db_pool.get_ref(), user_id).await? {
        Some(u) => u,
        None => return Err(crate::Error::NotFound),
    };

    if user_id == Key(1) {
        user.admin = Some(interop::Admin {
            db_name: env::var("SQLITE_DB")?,
        });
    }

    Ok(HttpResponse::Ok().json(user))
}

pub async fn edit_ui_config(
    edit_ui_config: Json<interop::EditUiConfig>,
    db_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit_ui_config");

    let user_id = session::user_id(&session)?;

    let edit_ui_config = edit_ui_config.into_inner();

    db::edit_ui_config(&db_pool, user_id, edit_ui_config.json).await?;

    // send response
    Ok(HttpResponse::Ok().json(true))
}

fn generate_random_salt() -> [u8; 16] {
    let mut salt = [0; 16];
    rng().fill_bytes(&mut salt);

    salt
}

fn hash_password(password: &str) -> crate::Result<String> {
    let salt = generate_random_salt();
    let hash = argon2::hash_encoded(password.as_bytes(), &salt, &argon2::Config::default())?;

    Ok(hash)
}
