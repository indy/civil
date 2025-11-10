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

use crate::db::quotes as db;
use crate::db::{SqlitePool, db_thread};
use crate::handler::{AuthUser, PaginationQuery, decks};
use crate::interop::IdParam;
use crate::interop::decks::DeckKind;
use crate::interop::quotes as interop;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path, Query};

pub async fn create(
    Json(proto_quote): Json<interop::ProtoQuote>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let quote = db_thread(&sqlite_pool, move |conn| {
        db::get_or_create(conn, user_id, proto_quote)
    })
    .await?;

    Ok(Json(quote))
}

pub async fn random(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let quote = db_thread(&sqlite_pool, move |conn| db::random(conn, user_id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(quote))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Quote).await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let quote = db_thread(&sqlite_pool, move |conn| db::get(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(quote))
}

pub async fn next(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let quote = db_thread(&sqlite_pool, move |conn| db::next(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(quote))
}

pub async fn prev(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let quote = db_thread(&sqlite_pool, move |conn| db::prev(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(quote))
}

pub async fn edit(
    Json(quote): Json<interop::ProtoQuote>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let quote = db_thread(&sqlite_pool, move |conn| {
        db::edit(conn, user_id, quote, params.id)
    })
    .await?;

    Ok(Json(quote))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    decks::delete(sqlite_pool, user_id, params.id).await
}
