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

use crate::db::decks as db;
use crate::error::Result;
use crate::interop::decks::{LinkBack, RefKind};
use crate::session;
use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use serde::Deserialize;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ResultList {
    pub results: Vec<LinkBack>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct GraphList {
    // triplet of from_id, to_id, strength
    pub results: Vec<i32>,
}

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

    let results = db::search(&db_pool, user_id, &query.q).await?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
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

    let results = db::recent(&db_pool, user_id, &query.resource).await?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
}

pub fn packed_kind(kind: RefKind) -> i32 {
    match kind {
        RefKind::Ref => 0,
        RefKind::RefToParent => -1,
        RefKind::RefToChild => 1,
        RefKind::RefInContrast => 42,
        RefKind::RefCritical => 99,
    }
}

pub async fn graph(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("graph");

    let user_id = session::user_id(&session)?;

    let results = db::graph(&db_pool, user_id).await?;

    // pack the graph information as integer quadruples
    let mut vs: Vec<i32> = vec![];
    for r in results {
        vs.push(r.from_id as i32);
        vs.push(r.to_id as i32);
        vs.push(packed_kind(r.kind));
        vs.push(r.strength as i32);
    }

    let res = GraphList { results: vs };
    Ok(HttpResponse::Ok().json(res))
}
