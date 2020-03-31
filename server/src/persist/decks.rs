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
use crate::persist::dates;
use crate::persist::edges;
use crate::persist::locations;
use crate::persist::notes;
use crate::persist::timespans;
use deadpool_postgres::{Client, Pool, Transaction};
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

    pub date_id: Option<Key>,
    pub location_id: Option<Key>,

    pub timespan_id: Option<Key>,
    pub location2_id: Option<Key>,
}

async fn get_owned(tx: &Transaction<'_>, id: Key, user_id: Key) -> Result<Deck> {
    pg::one::<Deck>(tx, include_str!("sql/decks_get.sql"), &[&id, &user_id]).await
}

// delete anything that's represented as a deck (subject, article, historical_person, historical_point)
//
pub(crate) async fn delete(db_pool: &Pool, id: Key, user_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = get_owned(&tx, id, user_id).await?;

    notes::delete_all_notes_connected_with_deck(&tx, user_id, id).await?;
    edges::delete_all_edges_connected_with_deck(&tx, id).await?;

    let stmt = include_str!("sql/decks_delete.sql");
    pg::zero(&tx, &stmt, &[&id, &user_id]).await?;

    if let Some(id) = deck.date_id {
        dates::delete(&tx, id).await?;
    }

    if let Some(id) = deck.location_id {
        locations::delete(&tx, id).await?;
    }

    if let Some(id) = deck.timespan_id {
        timespans::delete(&tx, id).await?;
    }

    if let Some(id) = deck.location2_id {
        locations::delete(&tx, id).await?;
    }

    tx.commit().await?;

    Ok(())
}
