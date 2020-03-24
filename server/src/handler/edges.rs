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
use crate::interop::IdParam;
use crate::persist::edges as db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

pub mod interop {
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Edge {
        pub id: Key,

        pub from_deck_id: Option<Key>,
        pub to_deck_id: Option<Key>,
        pub from_note_id: Option<Key>,
        pub to_note_id: Option<Key>,
    }

    // currently these are all from Note to a Deck based model
    //
    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateEdge {
        pub note_id: Option<Key>,
        pub person_id: Option<Key>,
        pub subject_id: Option<Key>,
    }
}

pub async fn create_edge(
    edge: Json<interop::CreateEdge>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_edge");
    let edge = edge.into_inner();
    let user_id = session::user_id(&session)?;

    // db statement
    let edge = db::create(&db_pool, &edge, user_id).await?;

    Ok(HttpResponse::Ok().json(edge))
}

pub async fn delete_edge(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}
