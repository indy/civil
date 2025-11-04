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
use crate::db::SqlitePool;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn create_bookmark(
    deck_id: Json<Key>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    let deck_id = deck_id.into_inner();
    info!("create_bookmark {:?}", &deck_id);

    let user_id = session::user_id(&session)?;

    db::create_bookmark(&sqlite_pool, user_id, deck_id)?;

    // return all of the user's bookmarks
    let bookmarks = db::get_bookmarks(&sqlite_pool, user_id)?;
    Ok(HttpResponse::Ok().json(bookmarks))
}

pub async fn create_multiple_bookmarks(
    deck_ids: Json<Vec<Key>>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    let deck_ids = deck_ids.into_inner();
    info!("create_multiple_bookmarks");

    let user_id = session::user_id(&session)?;

    db::create_multiple_bookmarks(&sqlite_pool, user_id, deck_ids)?;

    // return all of the user's bookmarks
    let bookmarks = db::get_bookmarks(&sqlite_pool, user_id)?;
    Ok(HttpResponse::Ok().json(bookmarks))
}

pub async fn get_bookmarks(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_bookmarks");

    let user_id = session::user_id(&session)?;

    let bookmarks = db::get_bookmarks(&sqlite_pool, user_id)?;
    Ok(HttpResponse::Ok().json(bookmarks))
}

pub async fn delete_bookmark(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("delete_bookmark {}", params.id);

    let user_id = session::user_id(&session)?;

    db::delete_bookmark(&sqlite_pool, user_id, params.id)?;

    // return all of the user's bookmarks
    let bookmarks = db::get_bookmarks(&sqlite_pool, user_id)?;
    Ok(HttpResponse::Ok().json(bookmarks))
}
