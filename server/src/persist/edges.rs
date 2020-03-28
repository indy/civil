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
use crate::interop::edges as interop;
use crate::interop::{Key, Model};
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes_decks")]
struct NoteDeckEdge {
    note_id: Key,
    deck_id: Key,
}

impl From<NoteDeckEdge> for interop::Edge {
    fn from(e: NoteDeckEdge) -> interop::Edge {
        interop::Edge {
            from_deck_id: None,
            to_deck_id: Some(e.deck_id),
            from_note_id: Some(e.note_id),
            to_note_id: None,
        }
    }
}

// currently this function only creates edges 'from' a note 'to' a deck derived struct
pub(crate) async fn create(
    db_pool: &Pool,
    edge: &interop::CreateEdge,
    _user_id: Key,
) -> Result<interop::Edge> {
    let to_id: Key;

    // todo: make this code good
    if let Some(id) = edge.person_id {
        to_id = id;
    } else if let Some(id) = edge.subject_id {
        to_id = id;
    } else {
        return Err(Error::ModelConversion);
    };

    let note_id;
    if let Some(id) = edge.note_id {
        note_id = id;
    } else {
        return Err(Error::MissingField);
    }

    let stmt = include_str!("sql/edges_create_from_note_to_deck.sql");

    pg::one_from::<NoteDeckEdge, interop::Edge>(db_pool, &stmt, &[&note_id, &to_id]).await
}

pub(crate) async fn delete(db_pool: &Pool, edge_id: Key, _user_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let stmt = pg::delete_statement(Model::Edge)?;

    pg::zero(&tx, &stmt, &[&edge_id]).await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn create_deck_to_note_edge(
    tx: &Transaction<'_>,
    deck_id: Key,
    note_id: Key,
) -> Result<()> {
    let stmt = include_str!("sql/edges_create_from_deck_to_note.sql");

    // normally a pg::one for create, but we're not going
    // to return anything when creating an edge
    //
    pg::zero(tx, &stmt, &[&deck_id, &note_id]).await?;

    Ok(())
}

pub(crate) async fn delete_all_edges_connected_with_deck(
    tx: &Transaction<'_>,
    deck_id: Key,
) -> Result<()> {
    let stmt = include_str!("sql/edges_delete_deck.sql");

    pg::zero(tx, &stmt, &[&deck_id]).await?;
    Ok(())
}

pub(crate) async fn delete_all_edges_connected_with_note(
    tx: &Transaction<'_>,
    id: Key,
) -> Result<()> {
    let stmt = include_str!("sql/edges_delete_note.sql");

    pg::zero(tx, &stmt, &[&id]).await?;
    Ok(())
}
