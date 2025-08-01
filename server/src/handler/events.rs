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
use crate::db::notes as notes_db;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::{DeckKind, ProtoDeck};
use crate::interop::events as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path, Query};
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

    let event = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(event))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let events = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(events))
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
        DeckKind::Event,
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
    let event_id = params.id;

    let mut event = db::get(&sqlite_pool, user_id, event_id)?;
    sqlite_augment(&sqlite_pool, &mut event, event_id)?;

    Ok(HttpResponse::Ok().json(event))
}

pub async fn edit(
    event: Json<interop::ProtoEvent>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let event_id = params.id;
    let event = event.into_inner();

    let mut event = db::edit(&sqlite_pool, user_id, &event, event_id)?;
    sqlite_augment(&sqlite_pool, &mut event, event_id)?;

    Ok(HttpResponse::Ok().json(event))
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

fn sqlite_augment(
    sqlite_pool: &Data<SqlitePool>,
    event: &mut interop::Event,
    event_id: Key,
) -> crate::Result<()> {
    event.notes = notes_db::notes_for_deck(sqlite_pool, event_id)?;
    event.arrivals = notes_db::arrivals_for_deck(sqlite_pool, event_id)?;

    Ok(())
}
