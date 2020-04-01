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
use crate::interop::subjects as interop;
use crate::interop::IdParam;
use crate::interop::Model;
use crate::persist::edges as edges_db;
use crate::persist::notes as notes_db;
use crate::persist::subjects as db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    subject: Json<interop::CreateSubject>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let subject = subject.into_inner();
    let user_id = session::user_id(&session)?;

    let subject = db::create(&db_pool, user_id, &subject).await?;

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let subjects = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(subjects))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let subject_id = params.id;
    let mut subject = db::get(&db_pool, user_id, subject_id).await?;

    let notes = notes_db::all_notes_for(&db_pool, subject_id, notes_db::NoteType::Note).await?;
    subject.notes = Some(notes);

    let quotes = notes_db::all_notes_for(&db_pool, subject_id, notes_db::NoteType::Quote).await?;
    subject.quotes = Some(quotes);

    let tags_in_notes = edges_db::from_deck_id_via_notes_to_tags(&db_pool, subject_id).await?;
    subject.tags_in_notes = Some(tags_in_notes);

    let decks_in_notes = edges_db::from_deck_id_via_notes_to_decks(&db_pool, subject_id).await?;
    subject.decks_in_notes = Some(decks_in_notes);

    // all the people that mention this subject
    let mentioned_by_people =
        edges_db::from_decks_via_notes_to_deck_id(&db_pool, Model::HistoricPerson, subject_id)
            .await?;
    subject.mentioned_by_people = Some(mentioned_by_people);

    // all the subjects that mention this subject
    let mentioned_in_subjects =
        edges_db::from_decks_via_notes_to_deck_id(&db_pool, Model::Subject, subject_id).await?;
    subject.mentioned_in_subjects = Some(mentioned_in_subjects);

    // all the articles that mention this subject
    let mentioned_in_articles =
        edges_db::from_decks_via_notes_to_deck_id(&db_pool, Model::Article, subject_id).await?;
    subject.mentioned_in_articles = Some(mentioned_in_articles);

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn edit(
    subject: Json<interop::Subject>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let subject = subject.into_inner();
    let user_id = session::user_id(&session)?;

    let subject = db::edit(&db_pool, user_id, &subject, params.id).await?;

    Ok(HttpResponse::Ok().json(subject))
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
