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

use crate::db::ideas as db;
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::DeckKind;
use crate::interop::ideas as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
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

    let idea = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let ideas = db::all(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(ideas))
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
        DeckKind::Idea,
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
    info!("get idea {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;

    let mut idea = db::get(&sqlite_pool, user_id, idea_id)?;
    sqlite_augment(&sqlite_pool, &mut idea, idea_id)?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn edit(
    idea: Json<interop::ProtoIdea>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;
    let idea = idea.into_inner();

    let mut idea = db::edit(&sqlite_pool, user_id, &idea, idea_id)?;
    sqlite_augment(&sqlite_pool, &mut idea, idea_id)?;

    Ok(HttpResponse::Ok().json(idea))
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
    idea: &mut interop::Idea,
    idea_id: Key,
) -> crate::Result<()> {
    idea.notes = notes_db::notes_for_deck(sqlite_pool, idea_id)?;
    idea.back_decks = notes_db::backdecks_for_deck(sqlite_pool, idea_id)?;
    idea.flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, idea_id)?;

    Ok(())
}
