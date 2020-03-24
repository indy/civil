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
use crate::interop::decks as interop;
use crate::interop::{model_to_node_kind, Key, Model};
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

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct DeckMention {
    id: Key,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct DeckReference {
    note_id: Key,
    id: Key,
    name: String,
}

impl From<DeckMention> for interop::DeckMention {
    fn from(d: DeckMention) -> interop::DeckMention {
        interop::DeckMention {
            id: d.id,
            name: d.name,
        }
    }
}

impl From<DeckReference> for interop::DeckReference {
    fn from(d: DeckReference) -> interop::DeckReference {
        interop::DeckReference {
            note_id: d.note_id,
            id: d.id,
            name: d.name,
        }
    }
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

    notes::delete_all_notes_connected_with_deck(&tx, id, user_id).await?;
    edges::delete_all_edges_connected_with_deck(&tx, id).await?;

    let stmt = include_str!("sql/decks_delete.sql");
    pg::zero::<Deck>(&tx, &stmt, &[&id, &user_id]).await?;

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

// return all the decks of a certain kind that mention another particular deck.
// e.g. deck_that_mention(db_pool, Model::HistoricPerson, Model::Subject, subject_id)
// will return all the people who mention the given subject, ordered by number of references
//
pub(crate) async fn that_mention(
    db_pool: &Pool,
    source_model: Model,
    mentioned_model: Model,
    mentioned_id: Key,
) -> Result<Vec<interop::DeckMention>> {
    let from_kind = model_to_node_kind(source_model)?;
    let to_kind = model_to_node_kind(mentioned_model)?;

    let stmt = include_str!("sql/decks_that_mention.sql");
    let stmt = stmt.replace("$from_kind", from_kind);
    let stmt = stmt.replace("$to_kind", to_kind);

    let mentioned =
        pg::many_from::<DeckMention, interop::DeckMention>(db_pool, &stmt, &[&mentioned_id])
            .await?;

    Ok(mentioned)
}

// return all the referenced models in the given deck
// e.g. referenced_in(db_pool, Model::Subject, subject_id, Model::HistoricPerson)
// will return all the people mentioned in the given subject
//
pub(crate) async fn referenced_in(
    db_pool: &Pool,
    model: Model,
    id: Key,
    referenced_model: Model,
) -> Result<Vec<interop::DeckReference>> {
    let to_kind = model_to_node_kind(referenced_model)?;
    let node_kind = model_to_node_kind(model)?;

    let stmt = include_str!("sql/decks_referenced.sql");
    let stmt = stmt.replace("$from_kind", node_kind);
    let stmt = stmt.replace("$to_kind", to_kind);

    let referenced =
        pg::many_from::<DeckReference, interop::DeckReference>(db_pool, &stmt, &[&id]).await?;

    Ok(referenced)
}
