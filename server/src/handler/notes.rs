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

use crate::db::notes as db;
use crate::error::Result;
use crate::interop::notes as interop;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use crate::db::sqlite::SqlitePool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create_notes(
    note: Json<interop::ProtoNote>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    info!("create_notes {:?}", &note);

    let user_id = session::user_id(&session)?;

    let notes = db::sqlite_create_notes(&sqlite_pool, user_id, &note)?;

    Ok(HttpResponse::Ok().json(notes))
}

pub async fn get_note(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_note {}", params.id);

    let user_id = session::user_id(&session)?;
    let note = db::sqlite_get_note(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_note(
    note: Json<interop::Note>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit_note");

    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::sqlite_edit_note(&sqlite_pool, user_id, &note, params.id)?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_note(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete_note {}", params.id);

    let user_id = session::user_id(&session)?;

    db::sqlite_delete_note_pool(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}
