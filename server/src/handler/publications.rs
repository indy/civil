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
use crate::db::publications as db;
use crate::error::Result;
use crate::interop::publications as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    publication: Json<interop::ProtoPublication>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let publication = publication.into_inner();

    let publication = db::create(&db_pool, user_id, &publication).await?;

    Ok(HttpResponse::Ok().json(publication))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;
    let publications = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(publications))
}

pub async fn get_listings(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_listings");

    let user_id = session::user_id(&session)?;
    let publications = db::listings(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(publications))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let publication_id = params.id;

    let mut publication = db::get(&db_pool, user_id, publication_id).await?;
    augment(&db_pool, &mut publication, publication_id).await?;

    Ok(HttpResponse::Ok().json(publication))
}

pub async fn edit(
    publication: Json<interop::ProtoPublication>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let publication_id = params.id;
    let publication = publication.into_inner();

    let mut publication = db::edit(&db_pool, user_id, &publication, publication_id).await?;
    augment(&db_pool, &mut publication, publication_id).await?;

    Ok(HttpResponse::Ok().json(publication))
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
    publication: &mut interop::Publication,
    publication_id: Key,
) -> Result<()> {
    let (notes, decks_in_notes, linkbacks_to_decks) = tokio::try_join!(
        notes_db::all_from_deck(&db_pool, publication_id),
        decks_db::from_deck_id_via_notes_to_decks(&db_pool, publication_id),
        decks_db::from_decks_via_notes_to_deck_id(&db_pool, publication_id),
    )?;

    publication.notes = Some(notes);
    publication.decks_in_notes = Some(decks_in_notes);
    publication.linkbacks_to_decks = Some(linkbacks_to_decks);

    Ok(())
}
