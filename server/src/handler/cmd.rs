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

use crate::db::decks as db;
use crate::error::Result;
use crate::session;
use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use serde::Deserialize;

#[allow(unused_imports)]
use tracing::info;

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
}

pub async fn search(
    db_pool: Data<Pool>,
    session: actix_session::Session,
    web::Query(query): web::Query<SearchQuery>,
) -> Result<HttpResponse> {
    info!("search '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let search = db::search(&db_pool, user_id, &query.q).await?;
    Ok(HttpResponse::Ok().json(search))
}

#[derive(Deserialize)]
pub struct RecentQuery {
    resource: String,
}

pub async fn recent(
    db_pool: Data<Pool>,
    session: actix_session::Session,
    web::Query(query): web::Query<RecentQuery>,
) -> Result<HttpResponse> {
    info!("recent {}", &query.resource);

    let user_id = session::user_id(&session)?;

    let search = db::recent(&db_pool, user_id, &query.resource).await?;
    Ok(HttpResponse::Ok().json(search))
}
