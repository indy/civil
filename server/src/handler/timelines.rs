// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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
use crate::db::notes as notes_db;
use crate::db::points as points_db;
use crate::db::timelines as db;
use crate::error::Result;
use crate::interop::points as points_interop;
use crate::interop::timelines as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    timeline: Json<interop::ProtoTimeline>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let timeline = timeline.into_inner();
    let user_id = session::user_id(&session)?;

    let timeline = db::create(&db_pool, user_id, &timeline).await?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let timelines = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(timelines))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let timeline_id = params.id;

    let mut timeline = db::get(&db_pool, user_id, timeline_id).await?;
    augment(&db_pool, &mut timeline, timeline_id, user_id).await?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn edit(
    timeline: Json<interop::ProtoTimeline>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let timeline_id = params.id;
    let timeline = timeline.into_inner();

    let mut timeline = db::edit(&db_pool, user_id, &timeline, timeline_id).await?;
    augment(&db_pool, &mut timeline, timeline_id, user_id).await?;

    Ok(HttpResponse::Ok().json(timeline))
}

pub async fn delete(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, user_id, params.id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub async fn add_point(
    point: Json<points_interop::ProtoPoint>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("add_point");

    let timeline_id = params.id;
    let point = point.into_inner();
    let user_id = session::user_id(&session)?;

    let _point = points_db::create(&db_pool, user_id, &point, timeline_id).await?;

    let mut timeline = db::get(&db_pool, user_id, timeline_id).await?;
    augment(&db_pool, &mut timeline, timeline_id, user_id).await?;

    Ok(HttpResponse::Ok().json(timeline))
}

async fn augment(
    db_pool: &Data<Pool>,
    timeline: &mut interop::Timeline,
    timeline_id: Key,
    user_id: Key,
) -> Result<()> {
    let (points, notes, decks_in_notes, linkbacks_to_decks) = tokio::try_join!(
        points_db::all(&db_pool, user_id, timeline_id),
        notes_db::all_from_deck(&db_pool, timeline_id),
        decks_db::from_deck_id_via_notes_to_decks(&db_pool, timeline_id),
        decks_db::from_decks_via_notes_to_deck_id(&db_pool, timeline_id),
    )?;

    timeline.points = Some(points);
    timeline.notes = Some(notes);
    timeline.decks_in_notes = Some(decks_in_notes);
    timeline.linkbacks_to_decks = Some(linkbacks_to_decks);

    Ok(())
}
