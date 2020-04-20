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
use crate::db::tags as db;
use crate::error::Result;
use crate::interop::decks::LinkBack;
use crate::interop::tags as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    tag: Json<interop::ProtoTag>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let tag = tag.into_inner();
    let user_id = session::user_id(&session)?;

    let tag = db::create(&db_pool, user_id, &tag).await?;

    Ok(HttpResponse::Ok().json(tag))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let tags = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(tags))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let tag_id = params.id;

    let mut tag = db::get(&db_pool, user_id, tag_id).await?;
    augment(&db_pool, user_id, &mut tag, tag_id).await?;

    Ok(HttpResponse::Ok().json(tag))
}

pub async fn edit(
    tag: Json<interop::ProtoTag>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let tag_id = params.id;
    let tag = tag.into_inner();

    let mut tag = db::edit(&db_pool, user_id, &tag, tag_id).await?;
    augment(&db_pool, user_id, &mut tag, tag_id).await?;

    Ok(HttpResponse::Ok().json(tag))
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

async fn augment(
    db_pool: &Data<Pool>,
    user_id: Key,
    tag: &mut interop::Tag,
    tag_id: Key,
) -> Result<()> {
    let (notes, decks_in_notes, linkbacks_to_decks) = tokio::try_join!(
        notes_db::all_from_deck(&db_pool, tag_id),
        decks_db::from_deck_id_via_notes_to_decks(&db_pool, tag_id),
        decks_db::from_decks_via_notes_to_deck_id(&db_pool, tag_id),
    )?;

    let mut search_term = tag.name.to_string();
    // replace hyphens with spaces
    search_term = search_term.replace("-", " ");
    let search_results = decks_db::search(&db_pool, user_id, &search_term).await?;

    // dedupe search results against the linkbacks to decks
    let additional_search_results = search_results
        .into_iter()
        .filter(|lb| lb.id != tag.id && !contains(lb, &linkbacks_to_decks))
        .collect();

    tag.notes = Some(notes);
    tag.decks_in_notes = Some(decks_in_notes);
    tag.linkbacks_to_decks = Some(linkbacks_to_decks);
    tag.search_results = Some(additional_search_results);

    Ok(())
}

fn contains(linkback: &LinkBack, linkbacks: &Vec<LinkBack>) -> bool {
    linkbacks.iter().any(|l| l.id == linkback.id)
}
