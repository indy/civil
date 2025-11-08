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
use crate::db::SqlitePool;
use crate::handler::{AuthUser, PaginationQuery};
use crate::interop::articles as interop;
use crate::interop::decks::ProtoDeck;
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("create");

    let proto_deck = proto_deck.into_inner();

    let article = db::get_or_create(&sqlite_pool, user_id, proto_deck.title).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let articles = db::all(&sqlite_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(articles))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    query: Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    // can't use the decks::pagination since we require additional information
    recent(sqlite_pool, AuthUser(user_id), query).await
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated_recent = db::recent(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated_recent))
}

pub async fn orphans(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated_orphans =
        db::orphans(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated_orphans))
}

pub async fn rated(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated_rated = db::rated(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated_rated))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("get {:?}", params.id);

    let article_id = params.id;

    let article = match db::get(sqlite_pool.get_ref(), user_id, article_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(article))
}

pub async fn edit(
    article: Json<interop::ProtoArticle>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let article_id = params.id;
    let article = article.into_inner();

    let article = db::edit(&sqlite_pool, user_id, article, article_id).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("delete");

    db::delete(&sqlite_pool, user_id, params.id).await?;

    Ok(HttpResponse::Ok().json(true))
}
