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

use crate::db::points as points_db;
use crate::db::timelines as db;
use crate::db::{SqlitePool, db_thread};
use crate::handler::{AuthUser, PaginationQuery, decks};
use crate::interop::IdParam;
use crate::interop::decks::{DeckKind, ProtoDeck, ProtoSlimDeck};
use crate::interop::points as points_interop;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path, Query};

pub async fn create(
    Json(proto_deck): Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let timeline = db_thread(&sqlite_pool, move |conn| {
        db::get_or_create(conn, user_id, proto_deck.title)
    })
    .await?;

    Ok(Json(timeline))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let timelines = db_thread(&sqlite_pool, move |conn| db::all(conn, user_id)).await?;

    Ok(Json(timelines))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Timeline).await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let timeline = db_thread(&sqlite_pool, move |conn| db::get(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(timeline))
}

pub async fn edit(
    Json(timeline): Json<ProtoSlimDeck>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let timeline = db_thread(&sqlite_pool, move |conn| {
        db::edit(conn, user_id, timeline, params.id)
    })
    .await?;

    Ok(Json(timeline))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    decks::delete(sqlite_pool, user_id, params.id).await
}

pub async fn add_point(
    Json(point): Json<points_interop::ProtoPoint>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let timeline = db_thread(&sqlite_pool, move |conn| {
        points_db::create(conn, point, params.id)?;
        db::get(conn, user_id, params.id)
    })
    .await?
    .ok_or(crate::Error::NotFound)?;

    Ok(Json(timeline))
}

pub async fn add_multipoints(
    Json(points): Json<Vec<points_interop::ProtoPoint>>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let timeline = db_thread(&sqlite_pool, move |conn| {
        // nocheckin: shouldn't this be in a transaction?
        //
        for point in points {
            points_db::create(conn, point, params.id)?;
        }
        db::get(conn, user_id, params.id)
    })
    .await?
    .ok_or(crate::Error::NotFound)?;

    Ok(Json(timeline))
}
