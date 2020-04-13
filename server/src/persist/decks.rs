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
use crate::error::{Error, Result};
use crate::interop::Key;
use crate::persist::edges;
use crate::persist::notes;
use crate::persist::points;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Deck {
    pub id: Key,
    pub kind: String,

    pub name: String,
    pub source: Option<String>,
}

// delete anything that's represented as a deck (article, book, person, event)
//
pub(crate) async fn delete(db_pool: &Pool, user_id: Key, id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    notes::delete_all_notes_connected_with_deck(&tx, user_id, id).await?;
    edges::delete_all_edges_connected_with_deck(&tx, id).await?;
    // todo: <2020-04-14 Tue> once tags are decks, just have a deck_id on point
    points::delete_all_points_connected_with_deck(&tx, id).await?;

    let stmt = include_str!("sql/decks_delete.sql");
    pg::zero(&tx, &stmt, &[&user_id, &id]).await?;

    tx.commit().await?;

    Ok(())
}
