// Copyright (C) 2025 Inderjit Gill <email@indy.io>

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

use crate::db::predictions as db;
use crate::db::{SqlitePool, db_thread};
use crate::handler::decks;
use crate::handler::{AuthUser, PaginationQuery};
use crate::interop::IdParam;
use crate::interop::decks::{DeckKind, ProtoDeck};
use crate::interop::predictions as interop;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path, Query};

pub async fn create(
    Json(proto_deck): Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let prediction = db_thread(&sqlite_pool, move |conn| {
        db::get_or_create(conn, user_id, proto_deck.title)
    })
    .await?;

    Ok(Json(prediction))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let predictions = db_thread(&sqlite_pool, move |conn| db::all(conn, user_id)).await?;

    Ok(Json(predictions))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Prediction).await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let prediction = db_thread(&sqlite_pool, move |conn| db::get(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(prediction))
}

pub async fn edit(
    Json(prediction): Json<interop::ProtoPrediction>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let prediction = db_thread(&sqlite_pool, move |conn| {
        db::edit(conn, user_id, prediction, params.id)
    })
    .await?;

    Ok(Json(prediction))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    decks::delete(sqlite_pool, user_id, params.id).await
}
