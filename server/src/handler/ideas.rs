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

use crate::error::Result;
use crate::interop::ideas as interop;
use crate::interop::{IdParam, Key};
use crate::persist::edges as edges_db;
use crate::persist::ideas as db;
use crate::persist::notes as notes_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    idea: Json<interop::ProtoIdea>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let idea = idea.into_inner();

    let idea = db::create(&db_pool, user_id, &idea).await?;

    Ok(HttpResponse::Ok().json(idea))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let ideas = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(ideas))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

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
    let notes = notes_db::all_from_deck(&db_pool, idea_id).await?;
    idea.notes = Some(notes);

    let tags_in_notes = edges_db::from_deck_id_via_notes_to_tags(&db_pool, idea_id).await?;
    idea.tags_in_notes = Some(tags_in_notes);

    let decks_in_notes = edges_db::from_deck_id_via_notes_to_decks(&db_pool, idea_id).await?;
    idea.decks_in_notes = Some(decks_in_notes);

    let linkbacks_to_decks = edges_db::from_decks_via_notes_to_deck_id(&db_pool, idea_id).await?;
    idea.linkbacks_to_decks = Some(linkbacks_to_decks);

    let linkbacks_to_tags = edges_db::from_tags_via_notes_to_deck_id(&db_pool, idea_id).await?;
    idea.linkbacks_to_tags = Some(linkbacks_to_tags);

    Ok(())
}