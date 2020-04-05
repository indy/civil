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
use crate::persist::autocomplete as db;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn get_tags(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_tags");

    let user_id = session::user_id(&session)?;
    let autocomplete = db::get_tags(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(autocomplete))
}

pub async fn get_decks(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_decks");

    let user_id = session::user_id(&session)?;

    let autocomplete = db::get_decks(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(autocomplete))
}
