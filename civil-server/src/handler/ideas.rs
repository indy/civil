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
use crate::interop::decks::{DeckSimple, Ref};
use crate::interop::ideas as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let idea = db::get_or_create(&db_pool, user_id, &proto_deck.title).await?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let ideas = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(ideas))
}

pub async fn get_listings(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_listings");

    let user_id = session::user_id(&session)?;

    let ideas = db::listings(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(ideas))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get idea {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;

    let mut idea = db::get(&db_pool, user_id, idea_id).await?;
    augment(&db_pool, &mut idea, idea_id).await?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn edit(
    idea: Json<interop::ProtoIdea>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;
    let idea = idea.into_inner();

    let mut idea = db::edit(&db_pool, user_id, &idea, idea_id).await?;
    augment(&db_pool, &mut idea, idea_id).await?;

    Ok(HttpResponse::Ok().json(idea))
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

async fn augment(db_pool: &Data<Pool>, idea: &mut interop::Idea, idea_id: Key) -> Result<()> {
    let (notes, refs, backrefs, flashcards) = tokio::try_join!(
        notes_db::all_from_deck(&db_pool, idea_id),
        decks_db::from_deck_id_via_notes_to_decks(&db_pool, idea_id),
        decks_db::from_decks_via_notes_to_deck_id(&db_pool, idea_id),
        sr_db::all_flashcards_for_deck(&db_pool, idea_id),
    )?;

    idea.notes = Some(notes);
    idea.refs = Some(refs);
    idea.backrefs = Some(backrefs);
    idea.flashcards = Some(flashcards);

    Ok(())
}

fn contains(backref: &DeckSimple, backrefs: &[Ref]) -> bool {
    backrefs.iter().any(|br| br.id == backref.id)
}

pub async fn additional_search(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("additional_search {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let idea_id = params.id;

    let (backrefs, search_results) = tokio::try_join!(
        decks_db::from_decks_via_notes_to_deck_id(&db_pool, idea_id),
        decks_db::search_using_deck_id(&db_pool, user_id, idea_id) // this is slow
    )?;

    // dedupe search results against the backrefs to decks
    let additional_search_results: Vec<DeckSimple> = search_results
        .into_iter()
        .filter(|br| br.id != idea_id && !contains(br, &backrefs))
        .collect();

    let res = interop::SearchResults {
        results: Some(additional_search_results),
    };

    Ok(HttpResponse::Ok().json(res))
}
