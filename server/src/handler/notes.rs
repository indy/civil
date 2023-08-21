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
use crate::db::sqlite::SqlitePool;
use crate::handler::SearchQuery;
use crate::interop::notes as interop;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{self, Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn seek(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("search '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::seek(&sqlite_pool, user_id, &query.q)?;

    let res = interop::SeekResults { results };
    Ok(HttpResponse::Ok().json(res))
}

pub async fn create_notes(
    note: Json<interop::ProtoNote>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    let note = note.into_inner();
    info!("create_notes {:?}", &note);

    let user_id = session::user_id(&session)?;

    let notes = db::create_notes(&sqlite_pool, user_id, &note)?;

    // anything that alters the structure of a deck's notes should return _all_ the notes associated with that deck
    Ok(HttpResponse::Ok().json(notes))
}

pub async fn get_note(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_note {}", params.id);

    let user_id = session::user_id(&session)?;
    let note = db::get_note(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_note(
    note: Json<interop::Note>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit_note");

    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::edit_note(&sqlite_pool, user_id, &note, params.id)?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_note(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("delete_note {}", params.id);

    let user_id = session::user_id(&session)?;

    let notes = db::delete_note_properly(&sqlite_pool, user_id, params.id)?;
    // anything that alters the structure of a deck's notes should return _all_ the notes associated with that deck
    Ok(HttpResponse::Ok().json(notes))
}
