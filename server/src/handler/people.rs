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

use crate::db::people as db;
use crate::db::points as points_db;
use crate::db::SqlitePool;
use crate::handler::{decks, AuthUser, PaginationQuery};
use crate::interop::decks::{DeckKind, ProtoDeck, ProtoSlimDeck};
use crate::interop::points as points_interop;
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

    let person = db::get_or_create(&sqlite_pool, user_id, proto_deck.title).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let people = db::all(&sqlite_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(people))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Person).await
}

pub async fn uncategorised(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated = db::uncategorised(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated))
}

pub async fn ancient(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated = db::ancient(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated))
}

pub async fn medieval(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated = db::medieval(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated))
}

pub async fn modern(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated = db::modern(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated))
}

pub async fn contemporary(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let paginated = db::contemporary(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(HttpResponse::Ok().json(paginated))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("get person {:?}", params.id);

    let person_id = params.id;

    let person = match db::get(sqlite_pool.get_ref(), user_id, person_id).await? {
        Some(p) => p,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(person))
}

pub async fn edit(
    person: Json<ProtoSlimDeck>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let person_id = params.id;
    let person = person.into_inner();

    let person = db::edit(&sqlite_pool, user_id, person, person_id).await?;

    Ok(HttpResponse::Ok().json(person))
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

pub async fn add_point(
    point: Json<points_interop::ProtoPoint>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("add_point");

    let person_id = params.id;
    let point = point.into_inner();

    points_db::create(&sqlite_pool, point, person_id).await?;

    let person = db::get(&sqlite_pool, user_id, person_id).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn add_multipoints(
    points: Json<Vec<points_interop::ProtoPoint>>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("add_multipoints");

    let person_id = params.id;
    let points = points.into_inner();

    for point in points {
        points_db::create(&sqlite_pool, point, person_id).await?;
    }

    let person = db::get(&sqlite_pool, user_id, person_id).await?;

    Ok(HttpResponse::Ok().json(person))
}
