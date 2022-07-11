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

use crate::db::edges as db;
use crate::db::sqlite::SqlitePool;
use crate::error::Result;
use crate::interop::edges as interop;
use crate::session;
use actix_web::web::{Data, Json};
use actix_web::HttpResponse;
#[allow(unused_imports)]
use tracing::info;

pub async fn create_from_note_to_decks(
    note_references: Json<interop::ProtoNoteReferences>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_from_note_to_decks");

    let note_references = note_references.into_inner();
    let user_id = session::user_id(&session)?;

    let all_decks_for_note =
        db::create_from_note_to_decks(&sqlite_pool, &note_references, user_id)?;

    Ok(HttpResponse::Ok().json(all_decks_for_note))
}
