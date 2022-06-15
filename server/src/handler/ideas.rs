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
use crate::db::notes as notes_db;
use crate::db::sr as sr_db;
use crate::error::Result;
use crate::interop::decks::SearchResults;
use crate::interop::ideas as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use crate::db::sqlite::SqlitePool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let idea = db::sqlite_get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn get_all(sqlite_pool: Data<SqlitePool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let ideas = db::sqlite_all(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(ideas))
}

pub async fn get_listings(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_listings");

    let user_id = session::user_id(&session)?;

    let ideas = db::sqlite_listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(ideas))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get idea {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;

    let mut idea = db::sqlite_get(&sqlite_pool, user_id, idea_id)?;
    sqlite_augment(&sqlite_pool, &mut idea, idea_id)?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn edit(
    idea: Json<interop::ProtoIdea>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;
    let idea = idea.into_inner();

    let mut idea = db::sqlite_edit(&sqlite_pool, user_id, &idea, idea_id)?;
    sqlite_augment(&sqlite_pool, &mut idea, idea_id)?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::sqlite_delete(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}

fn sqlite_augment(sqlite_pool: &Data<SqlitePool>, idea: &mut interop::SqliteIdea, idea_id: Key) -> Result<()> {
    let notes = notes_db::sqlite_all_from_deck(&sqlite_pool, idea_id)?;
    let refs = decks_db::sqlite_from_deck_id_via_notes_to_decks(&sqlite_pool, idea_id)?;
    let backnotes = decks_db::sqlite_get_backnotes(&sqlite_pool, idea_id)?;
    let backrefs = decks_db::sqlite_get_backrefs(&sqlite_pool, idea_id)?;
    let flashcards = sr_db::sqlite_all_flashcards_for_deck(&sqlite_pool, idea_id)?;

    idea.notes = Some(notes);
    idea.refs = Some(refs);
    idea.backnotes = Some(backnotes);
    idea.backrefs = Some(backrefs);
    idea.flashcards = Some(flashcards);

    Ok(())
}

pub async fn additional_search(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("additional_search {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;

    let additional_search_results = decks_db::sqlite_additional_search(&sqlite_pool, user_id, idea_id)?;

    let res = SearchResults {
        results: Some(additional_search_results),
    };

    Ok(HttpResponse::Ok().json(res))
}
