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
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::concepts as interop;
use crate::interop::decks::{DeckKind, ProtoDeck, ProtoSlimDeck};
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let concept = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(concept))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let concepts = db::all(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(concepts))
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
        DeckKind::Concept,
    )
    .await
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let paginated_recent = db::recent(&sqlite_pool, user_id, query.offset, query.num_items)?;

    Ok(HttpResponse::Ok().json(paginated_recent))
}

pub async fn orphans(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let paginated_orphans = db::orphans(&sqlite_pool, user_id, query.offset, query.num_items)?;

    Ok(HttpResponse::Ok().json(paginated_orphans))
}

pub async fn unnoted(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let paginated_unnoted = db::unnoted(&sqlite_pool, user_id, query.offset, query.num_items)?;

    Ok(HttpResponse::Ok().json(paginated_unnoted))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get concept {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let concept_id = params.id;

    let mut concept = db::get(&sqlite_pool, user_id, concept_id)?;
    sqlite_augment(&sqlite_pool, &mut concept, concept_id)?;

    Ok(HttpResponse::Ok().json(concept))
}

pub async fn edit(
    concept: Json<ProtoSlimDeck>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let concept_id = params.id;
    let concept = concept.into_inner();

    let mut concept = db::edit(&sqlite_pool, user_id, &concept, concept_id)?;
    sqlite_augment(&sqlite_pool, &mut concept, concept_id)?;

    Ok(HttpResponse::Ok().json(concept))
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
    concept: &mut interop::Concept,
    concept_id: Key,
) -> crate::Result<()> {
    concept.notes = notes_db::notes_for_deck(sqlite_pool, concept_id)?;
    concept.arrivals = notes_db::arrivals_for_deck(sqlite_pool, concept_id)?;

    Ok(())
}
