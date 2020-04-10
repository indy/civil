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

use super::pg;
use crate::error::Result;
use crate::interop::search as interop;
use crate::interop::{kind_to_resource, Key};
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;
use crate::interop::edges as edges_interop;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct SearchResultDeck {
    id: Key,
    name: String,
    kind: String,
}

impl From<SearchResultDeck> for edges_interop::LinkBack {
    fn from(d: SearchResultDeck) -> edges_interop::LinkBack {
        let resource = kind_to_resource(d.kind.as_ref()).unwrap();
        edges_interop::LinkBack {
            id: d.id,
            name: d.name,
            resource: resource.to_string(),
        }
    }
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, query: &str) -> Result<interop::Search> {
    let results = get_decks(db_pool, user_id, query).await?;

    Ok(interop::Search {
        results,
    })
}

async fn get_decks(
    db_pool: &Pool,
    user_id: Key,
    query: &str,
) -> Result<Vec<edges_interop::LinkBack>> {
    let stmt = include_str!("sql/search_decks.sql");

    pg::many_from::<SearchResultDeck, edges_interop::LinkBack>(
        db_pool,
        &stmt,
        &[&user_id, &query],
    )
    .await
}
