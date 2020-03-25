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
use crate::interop::notes as interop;
use crate::interop::IdParam;
use crate::persist::notes as db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create_note(
    note: Json<interop::CreateNote>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    info!("create_note {:?}", &note);

    let user_id = session::user_id(&session)?;

    let note = db::create_note(&db_pool, &note, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn get_note(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let note = db::get_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_note(
    note: Json<interop::Note>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::edit_note(&db_pool, &note, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_note(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_note_pool(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub async fn create_quote(
    note: Json<interop::CreateNote>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::create_quote(&db_pool, &note, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn get_quote(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    // same implementation as note
    let note = db::get_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_quote(
    note: Json<interop::Note>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::edit_quote(&db_pool, &note, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_quote(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    // same implementation as note
    db::delete_note_pool(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}
