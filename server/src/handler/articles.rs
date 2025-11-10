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

use crate::db::articles as db;
use crate::db::{SqlitePool, db_thread};
use crate::handler::{AuthUser, PaginationQuery, decks};
use crate::interop::IdParam;
use crate::interop::articles as interop;
use crate::interop::decks::{DeckKind, ProtoDeck};
use actix_web::Responder;
use actix_web::web::{Data, Json, Path, Query};

pub async fn create(
    Json(proto_deck): Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let article = db_thread(&sqlite_pool, move |conn| {
        db::get_or_create(conn, user_id, proto_deck.title)
    })
    .await?;

    Ok(Json(article))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let articles = db_thread(&sqlite_pool, move |conn| db::all(conn, user_id)).await?;

    Ok(Json(articles))
}

// nocheckin: why does pagination just call recent?
pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    query: Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    // can't use the decks::pagination since we require additional information
    recent(sqlite_pool, AuthUser(user_id), query).await
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(PaginationQuery { offset, num_items }): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::paginated_recents(sqlite_pool, user_id, DeckKind::Article, offset, num_items).await
}

pub async fn orphans(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(PaginationQuery { offset, num_items }): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::paginated_orphans(sqlite_pool, user_id, DeckKind::Article, offset, num_items).await
}

pub async fn rated(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(PaginationQuery { offset, num_items }): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::paginated_rated(sqlite_pool, user_id, DeckKind::Article, offset, num_items).await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let article = db_thread(&sqlite_pool, move |conn| db::get(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(article))
}

pub async fn edit(
    Json(article): Json<interop::ProtoArticle>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let article = db_thread(&sqlite_pool, move |conn| {
        db::edit(conn, user_id, article, params.id)
    })
    .await?;

    Ok(Json(article))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    decks::delete(sqlite_pool, user_id, params.id).await
}
