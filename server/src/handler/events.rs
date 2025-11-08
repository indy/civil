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

use crate::db::events as db;
use crate::db::SqlitePool;
use crate::handler::decks;
use crate::handler::{AuthUser, PaginationQuery};
use crate::interop::decks::{DeckKind, ProtoDeck};
use crate::interop::events as interop;
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::Responder;

pub async fn create(
    Json(proto_deck): Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let event = db::get_or_create(&sqlite_pool, user_id, proto_deck.title).await?;

    Ok(Json(event))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let events = db::all(&sqlite_pool, user_id).await?;

    Ok(Json(events))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Event).await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let event = match db::get(&sqlite_pool, user_id, params.id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(Json(event))
}

pub async fn edit(
    Json(event): Json<interop::ProtoEvent>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let event = db::edit(&sqlite_pool, user_id, event, params.id).await?;

    Ok(Json(event))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    db::delete(&sqlite_pool, user_id, params.id).await?;

    Ok(Json(true))
}
