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
use crate::interop::historic_people as interop;
use crate::interop::IdParam;
use crate::interop::Model;
use crate::persist::decks as decks_db;
use crate::persist::historic_people as db;
use crate::persist::notes as notes_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    person: Json<interop::CreatePerson>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    // db statement
    let person = db::create(&db_pool, user_id, &person).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    // db statement
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

    // db statements
    let person_id = params.id;
    let mut person = db::get(&db_pool, user_id, person_id).await?;

    let notes = notes_db::all_notes_for(&db_pool, person_id, notes_db::NoteType::Note).await?;
    person.notes = Some(notes);

    let quotes = notes_db::all_notes_for(&db_pool, person_id, notes_db::NoteType::Quote).await?;
    person.quotes = Some(quotes);

    let people_referenced =
        decks_db::referenced_in(&db_pool, person_id, Model::HistoricPerson).await?;
    person.people_referenced = Some(people_referenced);

    let subjects_referenced = decks_db::referenced_in(&db_pool, person_id, Model::Subject).await?;
    person.subjects_referenced = Some(subjects_referenced);

    // all the people that mention this person
    let mentioned_by_people = decks_db::that_mention(
        &db_pool,
        Model::HistoricPerson,
        Model::HistoricPerson,
        person_id,
    )
    .await?;
    person.mentioned_by_people = Some(mentioned_by_people);

    // all the subjects that mention this person
    let mentioned_in_subjects =
        decks_db::that_mention(&db_pool, Model::Subject, Model::HistoricPerson, person_id).await?;
    person.mentioned_in_subjects = Some(mentioned_in_subjects);

    // all the articles that mention this person
    let mentioned_in_articles =
        decks_db::that_mention(&db_pool, Model::Article, Model::HistoricPerson, person_id).await?;
    person.mentioned_in_articles = Some(mentioned_in_articles);

    Ok(HttpResponse::Ok().json(person))
}

pub async fn edit(
    person: Json<interop::Person>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    let person = db::edit(&db_pool, user_id, &person, params.id).await?;

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
