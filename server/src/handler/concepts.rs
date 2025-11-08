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

use crate::db::concepts as db;
use crate::db::SqlitePool;
use crate::handler::{decks, AuthUser, PaginationQuery};
use crate::interop::decks::{DeckKind, ProtoDeck, ProtoSlimDeck};
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::Responder;

pub async fn create(
    Json(proto_deck): Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let concept = db::get_or_create(&sqlite_pool, user_id, proto_deck.title).await?;

    Ok(Json(concept))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let concepts = db::all(&sqlite_pool, user_id).await?;

    Ok(Json(concepts))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Concept).await
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    let recent = db::recent(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(Json(recent))
}

pub async fn orphans(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    let orphans = db::orphans(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(Json(orphans))
}

pub async fn unnoted(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    let unnoted = db::unnoted(&sqlite_pool, user_id, query.offset, query.num_items).await?;

    Ok(Json(unnoted))
}

pub async fn convert(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let idea = match db::convert(&sqlite_pool, user_id, params.id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(Json(idea))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let concept = match db::get(&sqlite_pool, user_id, params.id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(Json(concept))
}

pub async fn edit(
    Json(concept): Json<ProtoSlimDeck>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let concept = db::edit(&sqlite_pool, user_id, concept, params.id).await?;

    Ok(Json(concept))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    db::delete(&sqlite_pool, user_id, params.id).await?;

    Ok(Json(true))
}
