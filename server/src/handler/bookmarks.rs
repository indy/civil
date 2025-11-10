// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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

use crate::db::bookmarks as db;
use crate::db::{SqlitePool, db_thread};
use crate::handler::AuthUser;
use crate::interop::{IdParam, Key};
use actix_web::Responder;
use actix_web::web::{Data, Json, Path};

pub async fn create_bookmark(
    Json(deck_id): Json<Key>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let bookmarks = db_thread(&sqlite_pool, move |conn| {
        db::create_bookmark(conn, user_id, deck_id)?;
        db::get_bookmarks(conn, user_id)
    })
    .await?;

    Ok(Json(bookmarks))
}

pub async fn create_multiple_bookmarks(
    Json(deck_ids): Json<Vec<Key>>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let bookmarks = db_thread(&sqlite_pool, move |conn| {
        db::create_multiple_bookmarks(conn, user_id, deck_ids)?;
        db::get_bookmarks(conn, user_id)
    })
    .await?;

    Ok(Json(bookmarks))
}

pub async fn get_bookmarks(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let bookmarks = db_thread(&sqlite_pool, move |conn| db::get_bookmarks(conn, user_id)).await?;

    Ok(Json(bookmarks))
}

pub async fn delete_bookmark(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let bookmarks = db_thread(&sqlite_pool, move |conn| {
        db::delete_bookmark(conn, user_id, params.id)?;
        db::get_bookmarks(conn, user_id)
    })
    .await?;

    Ok(Json(bookmarks))
}
