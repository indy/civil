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

use crate::db::decks as decks_db;
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::points as points_db;
use crate::db::timelines as db;
use crate::interop::points as points_interop;
use crate::interop::timelines as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

use crate::db::sqlite::SqlitePool;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let timeline = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let timelines = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(timelines))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let timeline_id = params.id;

    let mut timeline = db::get(&sqlite_pool, user_id, timeline_id)?;
    sqlite_augment(&sqlite_pool, &mut timeline, timeline_id, user_id)?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn edit(
    timeline: Json<interop::ProtoTimeline>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let timeline_id = params.id;
    let timeline = timeline.into_inner();

    let mut timeline = db::edit(&sqlite_pool, user_id, &timeline, timeline_id)?;
    sqlite_augment(&sqlite_pool, &mut timeline, timeline_id, user_id)?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&sqlite_pool, user_id, params.id)?;

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

    points_db::create(&sqlite_pool, &point, timeline_id)?;

    let mut timeline = db::get(&sqlite_pool, user_id, timeline_id)?;
    sqlite_augment(&sqlite_pool, &mut timeline, timeline_id, user_id)?;

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

    for point in points {
        points_db::create(&sqlite_pool, &point, timeline_id)?;
    }

    let mut timeline = db::get(&sqlite_pool, user_id, timeline_id)?;
    sqlite_augment(&sqlite_pool, &mut timeline, timeline_id, user_id)?;

    Ok(HttpResponse::Ok().json(timeline))
}

fn sqlite_augment(
    sqlite_pool: &Data<SqlitePool>,
    timeline: &mut interop::Timeline,
    timeline_id: Key,
    user_id: Key,
) -> crate::Result<()> {
    timeline.points = points_db::all(sqlite_pool, user_id, timeline_id)?;
    timeline.notes = notes_db::all_from_deck(sqlite_pool, timeline_id)?;
    timeline.refs = decks_db::from_deck_id_via_notes_to_decks(sqlite_pool, timeline_id)?;
    timeline.backnotes = decks_db::get_backnotes(sqlite_pool, timeline_id)?;
    timeline.backrefs = decks_db::get_backrefs(sqlite_pool, timeline_id)?;
    timeline.flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, timeline_id)?;

    Ok(())
}
