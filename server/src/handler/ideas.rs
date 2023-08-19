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
use crate::db::ideas as db;
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::{DeckKind, SearchResults};
use crate::interop::ideas as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{self, Data, Json, Path};
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

pub async fn get_listings(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_listings");

    let user_id = session::user_id(&session)?;

    let ideas = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(ideas))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    decks::pagination(
        sqlite_pool,
        query,
        session::user_id(&session)?,
        DeckKind::Idea,
    )
    .await
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
    idea.notes = notes_db::all_from_deck(sqlite_pool, idea_id)?;
    idea.refs = decks_db::from_deck_id_via_notes_to_decks(sqlite_pool, idea_id)?;
    idea.backnotes = decks_db::get_backnotes(sqlite_pool, idea_id)?;
    idea.backrefs = decks_db::get_backrefs(sqlite_pool, idea_id)?;
    idea.flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, idea_id)?;

    Ok(())
}

pub async fn additional_search(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("additional_search {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;

    let additional_search_results = decks_db::additional_search(&sqlite_pool, user_id, idea_id)?;

    let res = SearchResults {
        results: Some(additional_search_results),
    };

    Ok(HttpResponse::Ok().json(res))
}
