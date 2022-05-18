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
use crate::error::Result;
use crate::interop::decks::RefKind;
use crate::interop::graph as interop;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub fn packed_kind(kind: RefKind) -> i32 {
    match kind {
        RefKind::Ref => 0,
        RefKind::RefToParent => -1,
        RefKind::RefToChild => 1,
        RefKind::RefInContrast => 42,
        RefKind::RefCritical => 99,
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct FullGraphStruct {
    pub graph_nodes: Vec<interop::Graph>,
    pub graph_connections: Vec<i32>,
}

pub async fn get(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get");

    let user_id = session::user_id(&session)?;

    let (graph_nodes, connections) = tokio::try_join!(
        db::get_decks(&db_pool, user_id),
        db::get_connections(&db_pool, user_id),
    )?;

    // pack the graph information as integer quadruples
    let mut graph_connections: Vec<i32> = vec![];
    for connection in connections {
        graph_connections.push(connection.from_id as i32);
        graph_connections.push(connection.to_id as i32);
        graph_connections.push(packed_kind(connection.kind));
        graph_connections.push(connection.strength as i32);
    }

    let full_graph = FullGraphStruct {
        graph_nodes,
        graph_connections,
    };
    Ok(HttpResponse::Ok().json(full_graph))
}
