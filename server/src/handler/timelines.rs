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
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::{DeckKind, ProtoDeck, ProtoSlimDeck};
use crate::interop::points as points_interop;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

use crate::db::SqlitePool;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let timeline = db::get_or_create(&sqlite_pool, user_id, proto_deck.title).await?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    // nocheckin: why is this db::listings when the ideas equivalent is db::all?
    let timelines = db::listings(&sqlite_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(timelines))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    decks::pagination(
        sqlite_pool,
        query,
        session::user_id(&session)?,
        DeckKind::Timeline,
    )
    .await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let timeline_id = params.id;

    let timeline = match db::get(sqlite_pool.get_ref(), user_id, timeline_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn edit(
    timeline: Json<ProtoSlimDeck>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let timeline_id = params.id;
    let timeline = timeline.into_inner();

    let timeline = db::edit(&sqlite_pool, user_id, timeline, timeline_id).await?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&sqlite_pool, user_id, params.id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub async fn add_point(
    point: Json<points_interop::ProtoPoint>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("add_point");

    let timeline_id = params.id;
    let point = point.into_inner();
    let user_id = session::user_id(&session)?;

    points_db::create(&sqlite_pool, point, timeline_id).await?;

    let timeline = match db::get(sqlite_pool.get_ref(), user_id, timeline_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn add_multipoints(
    points: Json<Vec<points_interop::ProtoPoint>>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("add_multipoints");

    let timeline_id = params.id;
    let points = points.into_inner();
    let user_id = session::user_id(&session)?;

    // todo: I think it's bad to do this, where every loop dispatches to the db thread
    for point in points {
        points_db::create(&sqlite_pool, point, timeline_id).await?;
    }

    let timeline = match db::get(sqlite_pool.get_ref(), user_id, timeline_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(timeline))
}
