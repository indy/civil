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
use crate::db::deck_kind::DeckKind;
use crate::db::notes;
use crate::db::points;
use crate::db::ref_kind::RefKind;
use crate::error::{Error, Result};
use crate::interop::decks as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

// used when constructing a type derived from deck (Idea, Publication etc)
// gets the basic information from the decks table for use with additional data to construct the final struct
// e.g. DeckBase + IdeaExtra to create an interop::Idea
//
#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct DeckBase {
    pub id: Key,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub graph_terminator: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct DeckReference {
    note_id: Key,
    id: Key,
    name: String,
    deck_kind: DeckKind,
    ref_kind: RefKind,
}

impl From<DeckReference> for interop::MarginConnection {
    fn from(d: DeckReference) -> interop::MarginConnection {
        interop::MarginConnection {
            note_id: d.note_id,
            id: d.id,
            name: d.name,
            resource: interop::DeckResource::from(d.deck_kind),
            kind: interop::RefKind::from(d.ref_kind),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct LinkBackToDeck {
    pub id: Key,
    pub name: String,
    pub kind: DeckKind,
}

impl From<LinkBackToDeck> for interop::LinkBack {
    fn from(d: LinkBackToDeck) -> interop::LinkBack {
        interop::LinkBack {
            id: d.id,
            name: d.name,
            resource: interop::DeckResource::from(d.kind),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Vertex {
    pub from_id: Key,
    pub to_id: Key,
    pub kind: RefKind,
    pub strength: i32,
}

impl From<Vertex> for interop::Vertex {
    fn from(v: Vertex) -> interop::Vertex {
        interop::Vertex {
            from_id: v.from_id,
            to_id: v.to_id,
            kind: interop::RefKind::from(v.kind),
            strength: v.strength as usize,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Deck {
    pub id: Key,
    pub kind: DeckKind,

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

fn contains(linkbacks: &[interop::LinkBack], id: Key) -> bool {
    for l in linkbacks {
        if l.id == id {
            return true;
        }
    }
    false
}

fn resource_string_to_deck_kind_string(resource: &str) -> Result<&'static str> {
    match resource {
        "events" => Ok("event"),
        "ideas" => Ok("idea"),
        "people" => Ok("person"),
        "publications" => Ok("publication"),
        _ => Err(Error::InvalidResource),
    }
}

pub(crate) async fn deckbase_get(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_id: Key,
    kind: DeckKind,
) -> Result<DeckBase> {
    pg::one::<DeckBase>(
        &tx,
        include_str!("sql/deckbase_get.sql"),
        &[&user_id, &deck_id, &kind],
    )
    .await
}

pub(crate) async fn deckbase_create(
    tx: &Transaction<'_>,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<DeckBase> {
    let graph_terminator = false;
    pg::one::<DeckBase>(
        &tx,
        include_str!("sql/deckbase_create.sql"),
        &[&user_id, &kind, &name, &graph_terminator],
    )
    .await
}

pub(crate) async fn deckbase_edit(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_id: Key,
    kind: DeckKind,
    name: &str,
    graph_terminator: bool,
) -> Result<DeckBase> {
    pg::one::<DeckBase>(
        &tx,
        include_str!("sql/deckbase_edit.sql"),
        &[&user_id, &deck_id, &kind, &name, &graph_terminator],
    )
    .await
}

pub(crate) async fn recent(
    db_pool: &Pool,
    user_id: Key,
    resource: &str,
) -> Result<Vec<interop::LinkBack>> {
    let deck_kind = resource_string_to_deck_kind_string(resource)?;
    let limit: i32 = 10;

    let stmt = include_str!("sql/decks_recent.sql");
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    pg::many_from::<LinkBackToDeck, interop::LinkBack>(db_pool, &stmt, &[&user_id]).await
}

pub(crate) async fn graph(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Vertex>> {
    let stmt = include_str!("sql/graph.sql");
    pg::many_from::<Vertex, interop::Vertex>(db_pool, &stmt, &[&user_id]).await
}

// delete anything that's represented as a deck (publication, person, event)
//
pub(crate) async fn delete(db_pool: &Pool, user_id: Key, id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    notes::delete_all_notes_connected_with_deck(&tx, user_id, id).await?;

    pg::zero(
        &tx,
        &include_str!("sql/publication_extras_delete.sql"),
        &[&id],
    )
    .await?;

    pg::zero(&tx, &include_str!("sql/idea_extras_delete.sql"), &[&id]).await?;

    pg::zero(
        &tx,
        &include_str!("sql/edges_delete_notes_decks_with_deck_id.sql"),
        &[&id],
    )
    .await?;

    points::delete_all_points_connected_with_deck(&tx, id).await?;

    let stmt = include_str!("sql/decks_delete.sql");
    pg::zero(&tx, &stmt, &[&user_id, &id]).await?;

    tx.commit().await?;

    Ok(())
}

// return all the decks of a certain kind that mention another particular deck.
// e.g. from_decks_via_notes_to_deck_id(db_pool, Model::Person, publication_id)
// will return all the people who mention the given publication, ordered by number of references
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
// e.g. from_deck_id_via_notes_to_decks(db_pool, publication_id)
// will return all the people, events, publications etc mentioned in the given publication
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
