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

use crate::db::graph as db;
use crate::db::SqlitePool;
use crate::handler::AuthUser;
use crate::interop::IdParam;
use actix_web::web::{Data, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    info!("get {:?}", params.id);

    let deck_id = params.id;

    let connectivity = db::get(&sqlite_pool, user_id, deck_id).await?;

    Ok(HttpResponse::Ok().json(connectivity))
}
