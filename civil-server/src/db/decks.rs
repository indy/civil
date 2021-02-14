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
struct Ref {
    note_id: Key,
    id: Key,
    name: String,
    deck_kind: DeckKind,
    ref_kind: RefKind,
    annotation: Option<String>,
}

impl From<Ref> for interop::Ref {
    fn from(d: Ref) -> interop::Ref {
        interop::Ref {
            note_id: d.note_id,
            note_content: None,
            id: d.id,
            name: d.name,
            resource: interop::DeckResource::from(d.deck_kind),
            ref_kind: interop::RefKind::from(d.ref_kind),
            annotation: d.annotation,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct BackRef {
    pub id: Key,
    pub name: String,
    pub kind: DeckKind,
}

impl From<BackRef> for interop::BackRef {
    fn from(d: BackRef) -> interop::BackRef {
        interop::BackRef {
            id: d.id,
            name: d.name,
            resource: interop::DeckResource::from(d.kind),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct DetailedBackRef {
    pub id: Key,
    pub name: String,
    pub kind: DeckKind,
    pub note_id: Key,
    pub note_content: String,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

impl From<DetailedBackRef> for interop::Ref {
    fn from(d: DetailedBackRef) -> interop::Ref {
        interop::Ref {
            note_id: d.note_id,
            note_content: Some(d.note_content),
            id: d.id,
            name: d.name,
            resource: interop::DeckResource::from(d.kind),
            ref_kind: interop::RefKind::from(d.ref_kind),
            annotation: d.annotation
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

pub(crate) async fn search_using_deck_id(
    db_pool: &Pool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::BackRef>> {
    let (mut results, results_via_notes, results_via_points) = tokio::try_join!(
        query_search_id(
            db_pool,
            "select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank_sum, 1 as rank_count
             from decks deckname, decks d
                  left join publication_extras pe on pe.deck_id = d.id,
                  plainto_tsquery(deckname.name) query,
                  to_tsvector(coalesce(d.name, '') || ' ' || coalesce(pe.source, '') || ' ' || coalesce(pe.author, '') || ' ' || coalesce(pe.short_description, '')) textsearch
             where textsearch @@ query
                   and d.user_id = $1
                   and deckname.id = $2
             group by d.id, textsearch, query
             order by rank_sum desc
             limit 10",
            user_id,
            deck_id
        ),
        query_search_id(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank
                   from decks deckname, decks d left join notes n on n.deck_id = d.id,
                        plainto_tsquery(deckname.name) query,
                        to_tsvector(coalesce(n.content, '')) textsearch
                   where textsearch @@ query
                         and d.user_id = $1
                         and deckname.id = $2
                         group by d.id, textsearch, query
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 10",
            user_id,
            deck_id
        ),
        query_search_id(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank
                   from decks deckname, decks d left join points p on p.deck_id = d.id,
                        plainto_tsquery(deckname.name) query,
                        to_tsvector(coalesce(p.title, '') || ' ' || coalesce(p.location_textual, '') || ' ' || coalesce(p.date_textual, '')) textsearch
                   where textsearch @@ query
                         and d.user_id = $1
                         and deckname.id = $2
                         group by d.id, textsearch, query
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 10",
            user_id,
            deck_id
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

pub(crate) async fn search(
    db_pool: &Pool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::BackRef>> {
    let (mut results, results_via_notes, results_via_points) = tokio::try_join!(
        query_search(
            db_pool,
            "select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank_sum, 1 as rank_count
             from decks d
                  left join publication_extras pe on pe.deck_id = d.id,
                  plainto_tsquery($2) query,
                  to_tsvector(coalesce(d.name, '') || ' ' || coalesce(pe.source, '') || ' ' || coalesce(pe.author, '') || ' ' || coalesce(pe.short_description, '')) textsearch
             where textsearch @@ query
                   and d.user_id = $1
             group by d.id, textsearch, query
             order by rank_sum desc
             limit 10",
            user_id,
            query
        ),
        query_search(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank
                   from decks d left join notes n on n.deck_id = d.id,
                        plainto_tsquery($2) query,
                        to_tsvector(coalesce(n.content, '')) textsearch
                   where textsearch @@ query
                         and d.user_id = $1
                         group by d.id, textsearch, query
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 10",
            user_id,
            query
        ),
        query_search(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank
                   from decks d left join points p on p.deck_id = d.id,
                        plainto_tsquery($2) query,
                        to_tsvector(coalesce(p.title, '') || ' ' || coalesce(p.location_textual, '') || ' ' || coalesce(p.date_textual, '')) textsearch
                   where textsearch @@ query
                         and d.user_id = $1
                         group by d.id, textsearch, query
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 10",
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
) -> Result<Vec<interop::BackRef>> {
    pg::many_from::<BackRef, interop::BackRef>(db_pool, &stmt, &[&user_id, &query]).await
}

async fn query_search_id(
    db_pool: &Pool,
    stmt: &str,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::BackRef>> {
    pg::many_from::<BackRef, interop::BackRef>(db_pool, &stmt, &[&user_id, &deck_id]).await
}

fn contains(backrefs: &[interop::BackRef], id: Key) -> bool {
    for br in backrefs {
        if br.id == id {
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
        "select id, name, created_at, graph_terminator
         from decks
         where user_id = $1 and id = $2 and kind = $3",
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
        "INSERT INTO decks(user_id, kind, name, graph_terminator)
         VALUES ($1, $2, $3, $4)
         RETURNING $table_fields",
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
        "UPDATE decks
         SET name = $4, graph_terminator = $5
         WHERE user_id = $1 and id = $2 and kind = $3
         RETURNING $table_fields",
        &[&user_id, &deck_id, &kind, &name, &graph_terminator],
    )
    .await
}

pub(crate) async fn recent(
    db_pool: &Pool,
    user_id: Key,
    resource: &str,
) -> Result<Vec<interop::BackRef>> {
    let deck_kind = resource_string_to_deck_kind_string(resource)?;
    let limit: i32 = 10;

    let stmt = "SELECT id, name, kind
                FROM decks
                WHERE user_id = $1 AND kind = '$deck_kind'::deck_kind
                ORDER BY created_at DESC
                LIMIT $limit";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    pg::many_from::<BackRef, interop::BackRef>(db_pool, &stmt, &[&user_id]).await
}

pub(crate) async fn graph(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Vertex>> {
    pg::many_from::<Vertex, interop::Vertex>(
        db_pool,
        "select d.id as from_id, nd.deck_id as to_id, nd.kind, count(*)::integer as strength
         from notes_decks nd, decks d, notes n
         where nd.note_id = n.id
               and n.deck_id = d.id
               and d.user_id = $1
         group by from_id, to_id, nd.kind
         order by from_id",
        &[&user_id],
    )
    .await
}

// delete anything that's represented as a deck (publication, person, event)
//
pub(crate) async fn delete(db_pool: &Pool, user_id: Key, id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    notes::delete_all_notes_connected_with_deck(&tx, user_id, id).await?;

    pg::zero(
        &tx,
        "DELETE FROM publication_extras WHERE deck_id = $1",
        &[&id],
    )
    .await?;

    pg::zero(&tx, "DELETE FROM idea_extras WHERE deck_id = $1", &[&id]).await?;

    pg::zero(&tx, "DELETE FROM notes_decks WHERE deck_id = $1", &[&id]).await?;

    points::delete_all_points_connected_with_deck(&tx, id).await?;

    pg::zero(
        &tx,
        "DELETE FROM decks WHERE id = $2 AND user_id = $1",
        &[&user_id, &id],
    )
    .await?;

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
) -> Result<Vec<interop::Ref>> {
    pg::many_from::<DetailedBackRef, interop::Ref>(
        db_pool,
        "SELECT d.id AS id,
                d.name AS name,
                d.kind,
                n.content as note_content,
                n.id as note_id,
                nd.kind as ref_kind,
                nd.annotation as annotation
         FROM decks d,
              notes n,
              notes_decks nd
         WHERE n.deck_id = d.id
               AND nd.note_id = n.id
               AND nd.deck_id = $1",
        &[&deck_id],
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
) -> Result<Vec<interop::Ref>> {
    pg::many_from::<Ref, interop::Ref>(
        db_pool,
        "SELECT n.id as note_id,
                d.id,
                d.name,
                d.kind as deck_kind,
                nd.kind as ref_kind,
                nd.annotation
         FROM   notes n,
                notes_decks nd,
                decks d
         WHERE  n.deck_id = $1
                AND nd.note_id = n.id
                AND nd.deck_id = d.id",
        &[&deck_id],
    )
    .await
}
