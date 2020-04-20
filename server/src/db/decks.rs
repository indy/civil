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
use crate::db::notes;
use crate::db::points;
use crate::error::{Error, Result};
use crate::interop::decks as interop;
use crate::interop::{kind_to_resource, resource_to_kind, Key};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct DeckReference {
    note_id: Key,
    id: Key,
    name: String,
    kind: String,
}

impl From<DeckReference> for interop::MarginConnection {
    fn from(d: DeckReference) -> interop::MarginConnection {
        let resource = kind_to_resource(d.kind.as_ref()).unwrap();
        interop::MarginConnection {
            note_id: d.note_id,
            id: d.id,
            name: d.name,
            resource: resource.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct LinkBackToDeck {
    pub id: Key,
    pub name: String,
    pub kind: String,
}

impl From<LinkBackToDeck> for interop::LinkBack {
    fn from(d: LinkBackToDeck) -> interop::LinkBack {
        let resource = kind_to_resource(d.kind.as_ref()).unwrap();
        interop::LinkBack {
            id: d.id,
            name: d.name,
            resource: resource.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Deck {
    pub id: Key,
    pub kind: String,

    pub name: String,
    pub source: Option<String>,
}

pub(crate) async fn search(
    db_pool: &Pool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::LinkBack>> {
    let (mut results, results_via_notes, results_via_points) = tokio::try_join!(
        query_search(
            db_pool,
            include_str!("sql/decks_search.sql"),
            user_id,
            query
        ),
        query_search(
            db_pool,
            include_str!("sql/decks_search_notes.sql"),
            user_id,
            query
        ),
        query_search(
            db_pool,
            include_str!("sql/decks_search_points.sql"),
            user_id,
            query
        ),
    )?;

    for r in results_via_notes {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_points {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

async fn query_search(
    db_pool: &Pool,
    stmt: &str,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::LinkBack>> {
    pg::many_from::<LinkBackToDeck, interop::LinkBack>(db_pool, &stmt, &[&user_id, &query]).await
}

fn contains(linkbacks: &Vec<interop::LinkBack>, id: Key) -> bool {
    for l in linkbacks {
        if l.id == id {
            return true;
        }
    }
    false
}

pub(crate) async fn recent(
    db_pool: &Pool,
    user_id: Key,
    resource: &str,
) -> Result<Vec<interop::LinkBack>> {
    let deck_kind = resource_to_kind(resource)?;
    let limit: i32 = 10;

    let stmt = include_str!("sql/decks_recent.sql");
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    pg::many_from::<LinkBackToDeck, interop::LinkBack>(db_pool, &stmt, &[&user_id]).await
}

// delete anything that's represented as a deck (article, book, person, event)
//
pub(crate) async fn delete(db_pool: &Pool, user_id: Key, id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    notes::delete_all_notes_connected_with_deck(&tx, user_id, id).await?;

    pg::zero(
        &tx,
        &include_str!("sql/edges_delete_notes_decks_with_deck_id.sql"),
        &[&id],
    )
    .await?;

    // todo: <2020-04-14 Tue> once tags are decks, just have a deck_id on point
    points::delete_all_points_connected_with_deck(&tx, id).await?;

    let stmt = include_str!("sql/decks_delete.sql");
    pg::zero(&tx, &stmt, &[&user_id, &id]).await?;

    tx.commit().await?;

    Ok(())
}

// return all the decks of a certain kind that mention another particular deck.
// e.g. from_decks_via_notes_to_deck_id(db_pool, Model::Person, article_id)
// will return all the people who mention the given article, ordered by number of references
//
pub(crate) async fn from_decks_via_notes_to_deck_id(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<interop::LinkBack>> {
    linkbacks::<LinkBackToDeck>(
        db_pool,
        include_str!("sql/from_decks_via_notes_to_deck_id.sql"),
        deck_id,
    )
    .await
}

// return all the referenced decks in the given deck
// e.g. from_deck_id_via_notes_to_decks(db_pool, article_id)
// will return all the people, events, books, articles etc mentioned in the given article
//
pub(crate) async fn from_deck_id_via_notes_to_decks(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<interop::MarginConnection>> {
    margin_connections::<DeckReference>(
        db_pool,
        include_str!("sql/from_deck_id_via_notes_to_decks.sql"),
        deck_id,
    )
    .await
}

async fn margin_connections<T>(
    db_pool: &Pool,
    stmt: &str,
    id: Key,
) -> Result<Vec<interop::MarginConnection>>
where
    interop::MarginConnection: std::convert::From<T>,
    T: tokio_pg_mapper::FromTokioPostgresRow,
{
    pg::many_from::<T, interop::MarginConnection>(db_pool, stmt, &[&id]).await
}

async fn linkbacks<T>(db_pool: &Pool, stmt: &str, id: Key) -> Result<Vec<interop::LinkBack>>
where
    interop::LinkBack: std::convert::From<T>,
    T: tokio_pg_mapper::FromTokioPostgresRow,
{
    pg::many_from::<T, interop::LinkBack>(db_pool, stmt, &[&id]).await
}
