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
use crate::interop::people as interop;
use crate::interop::{IdParam, Key};
use crate::persist::edges as edges_db;
use crate::persist::notes as notes_db;
use crate::persist::people as db;
use crate::persist::points as points_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    person: Json<interop::ProtoPerson>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    let person = db::create(&db_pool, user_id, &person).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let people = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(people))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let person_id = params.id;

    let mut person = db::get(&db_pool, user_id, person_id).await?;
    augment(&db_pool, &mut person, person_id, user_id).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn edit(
    person: Json<interop::ProtoPerson>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let person_id = params.id;
    let person = person.into_inner();

    let mut person = db::edit(&db_pool, user_id, &person, person_id).await?;
    augment(&db_pool, &mut person, person_id, user_id).await?;

    Ok(HttpResponse::Ok().json(person))
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
    person: &mut interop::Person,
    person_id: Key,
    user_id: Key,
) -> Result<()> {
    let points = points_db::all(&db_pool, user_id, person_id).await?;
    person.points = Some(points);

    let notes = notes_db::all_from_deck(&db_pool, person_id).await?;
    person.notes = Some(notes);

    let decks_in_notes = edges_db::from_deck_id_via_notes_to_decks(&db_pool, person_id).await?;
    person.decks_in_notes = Some(decks_in_notes);

    let linkbacks_to_decks = edges_db::from_decks_via_notes_to_deck_id(&db_pool, person_id).await?;
    person.linkbacks_to_decks = Some(linkbacks_to_decks);

    Ok(())
}
