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

use crate::db::sqlite::SqlitePool;
use crate::db::stats as db;
use crate::error::Result;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let stats = db::get(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(stats))
}
