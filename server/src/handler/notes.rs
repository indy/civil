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
use crate::db::references as db_refs;
use crate::db::{SqlitePool, db_thread};
use crate::handler::AuthUser;
use crate::interop::IdParam;
use crate::interop::notes as interop;
use crate::interop::references as interop_refs;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path};

pub async fn create_notes(
    Json(note): Json<interop::ProtoNote>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let notes = db_thread(&sqlite_pool, move |conn| {
        db::create_notes(conn, user_id, note)
    })
    .await?;

    Ok(Json(notes))
}

pub async fn edit_note(
    Json(note): Json<interop::Note>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let note = db_thread(&sqlite_pool, move |conn| {
        db::edit_note(conn, user_id, note, params.id)
    })
    .await?;

    Ok(Json(note))
}

pub async fn delete_note(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let notes = db_thread(&sqlite_pool, move |conn| {
        db::delete_note_properly(conn, user_id, params.id)
    })
    .await?;

    Ok(Json(notes))
}

pub async fn edit_references(
    Json(diff): Json<interop_refs::ReferencesDiff>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let decks_for_note = db_thread(&sqlite_pool, move |conn| {
        db_refs::update_references(conn, diff, user_id, params.id)
    })
    .await?;

    Ok(Json(decks_for_note))
}
