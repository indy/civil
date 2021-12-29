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

pub(crate) enum DeckBaseOrigin {
    Created,
    PreExisting,
}

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
pub struct DeckSimple {
    pub id: Key,
    pub name: String,
    pub kind: DeckKind,
}

impl From<DeckSimple> for interop::DeckSimple {
    fn from(d: DeckSimple) -> interop::DeckSimple {
        interop::DeckSimple {
            id: d.id,
            name: d.name,
            resource: interop::DeckResource::from(d.kind),
        }
    }
}

// #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
// #[pg_mapper(table = "decks")]
// pub struct DetailedRef {
//     pub id: Key,
//     pub name: String,
//     pub kind: DeckKind,
//     pub note_id: Key,
//     pub note_content: String,
//     pub ref_kind: RefKind,
//     pub annotation: Option<String>,
// }

// impl From<DetailedRef> for interop::Ref {
//     fn from(d: DetailedRef) -> interop::Ref {
//         interop::Ref {
//             note_id: d.note_id,
//             note_content: Some(d.note_content),
//             id: d.id,
//             name: d.name,
//             resource: interop::DeckResource::from(d.kind),
//             ref_kind: interop::RefKind::from(d.ref_kind),
//             annotation: d.annotation,
//         }
//     }
// }

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct BackNote {
    pub note_id: Key,
    pub note_content: String,

    pub deck_id: Key,
    pub deck_name: String,

    pub kind: DeckKind,
}

impl From<BackNote> for interop::BackNote {
    fn from(d: BackNote) -> interop::BackNote {
        interop::BackNote {
            note_id: d.note_id,
            note_content: d.note_content,
            deck_id: d.deck_id,
            deck_name: d.deck_name,
            resource: interop::DeckResource::from(d.kind),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct BackRef {
    pub note_id: Key,
    pub deck_id: Key,
    pub deck_name: String,
    pub kind: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

impl From<BackRef> for interop::BackRef {
    fn from(d: BackRef) -> interop::BackRef {
        interop::BackRef {
            note_id: d.note_id,
            deck_id: d.deck_id,
            deck_name: d.deck_name,
            resource: interop::DeckResource::from(d.kind),
            ref_kind: interop::RefKind::from(d.ref_kind),
            annotation: d.annotation,
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
) -> Result<Vec<interop::DeckSimple>> {
    let (mut results, results_via_pub_ext, results_via_notes, results_via_points) = tokio::try_join!(
        query_search_id(
            db_pool,
            "select d.id, d.kind, d.name, ts_rank_cd(d.ts, phraseto_tsquery('english', deckname.name)) AS rank_sum, 1 as rank_count
             from decks deckname, decks d
             where d.ts @@ phraseto_tsquery('english', deckname.name)
                   and d.user_id = $1
                   and deckname.id = $2
             group by d.id, d.ts, deckname.name
             order by rank_sum desc
             limit 50",
            user_id,
            deck_id
        ),
        query_search_id(
            db_pool,
            "select d.id, d.kind, d.name, ts_rank_cd(pe.ts, phraseto_tsquery('english', deckname.name)) AS rank_sum, 1 as rank_count
             from decks deckname, decks d left join publication_extras pe on pe.deck_id = d.id
             where pe.ts @@ phraseto_tsquery('english', deckname.name)
                   and d.user_id = $1
                   and deckname.id = $2
             group by d.id, pe.ts, deckname.name
             order by rank_sum desc
             limit 50",
            user_id,
            deck_id
        ),
        query_search_id(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(n.ts, phraseto_tsquery('english', deckname.name)) AS rank
                   from decks deckname, decks d left join notes n on n.deck_id = d.id
                   where n.ts @@ phraseto_tsquery('english', deckname.name)
                         and d.user_id = $1
                         and deckname.id = $2
                         group by d.id, n.ts, deckname.name
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 50",
            user_id,
            deck_id
        ),
        query_search_id(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(p.ts, phraseto_tsquery('english', deckname.name)) AS rank
                   from decks deckname, decks d left join points p on p.deck_id = d.id
                   where p.ts @@ phraseto_tsquery('english', deckname.name)
                         and d.user_id = $1
                         and deckname.id = $2
                         group by d.id, p.ts, deckname.name
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 50",
            user_id,
            deck_id
        ),
    )?;

    for r in results_via_pub_ext {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

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
) -> Result<Vec<interop::DeckSimple>> {
    let (mut results, results_via_pub_ext, results_via_notes, results_via_points) = tokio::try_join!(
        query_search(
            db_pool,
            "select d.id, d.kind, d.name, ts_rank_cd(d.ts, plainto_tsquery('english', $2)) AS rank_sum, 1 as rank_count
             from decks d
             where d.ts @@ plainto_tsquery('english', $2)
                   and d.user_id = $1
             group by d.id, d.ts
             order by rank_sum desc
             limit 30",
            user_id,
            query
        ),
        query_search(
            db_pool,
            "select d.id, d.kind, d.name, ts_rank_cd(pe.ts, plainto_tsquery('english', $2)) AS rank_sum, 1 as rank_count
             from decks d
                  left join publication_extras pe on pe.deck_id = d.id
             where pe.ts @@ plainto_tsquery('english', $2)
                   and d.user_id = $1
             group by d.id, pe.ts
             order by rank_sum desc
             limit 30",
            user_id,
            query
        ),
        query_search(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(n.ts, plainto_tsquery('english', $2)) AS rank
                   from decks d left join notes n on n.deck_id = d.id
                   where n.ts @@ plainto_tsquery('english', $2)
                         and d.user_id = $1
                         group by d.id, n.ts
                         order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 30",
            user_id,
            query
        ),
        query_search(
            db_pool,
            "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
             from (select d.id, d.kind, d.name, ts_rank_cd(p.ts, plainto_tsquery('english', $2)) AS rank
                   from decks d left join points p on p.deck_id = d.id
                   where p.ts @@ plainto_tsquery('english', $2)
                         and d.user_id = $1
                   group by d.id, p.ts
                   order by rank desc) res
             group by res.id, res.kind, res.name
             order by sum(res.rank) desc
             limit 30",
            user_id,
            query
        ),
    )?;

    for r in results_via_pub_ext {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

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

pub(crate) async fn search_within_deck_kind_by_name(
    db_pool: &Pool,
    user_id: Key,
    deck_kind: DeckKind,
    query: &str,
) -> Result<Vec<interop::DeckSimple>> {
    let (mut results, res2) = tokio::try_join!(
        query_search_within_deck_kind(
            db_pool,
            "select id, kind, name, ts_rank_cd(ts, plainto_tsquery('english', $2)) AS rank_sum
             from decks
             where ts @@ plainto_tsquery('english', $2)
                   and user_id = $1
                   and kind = $3
             order by rank_sum desc
             limit 20",
            user_id,
            query,
            &deck_kind
        ),
        query_search_within_deck_kind(
            db_pool,
            "select id, kind, name
             from decks
             where name ilike '%' || $2 || '%'
                   and user_id = $1
                   and kind = $3
             limit 20",
            user_id,
            query,
            &deck_kind
        )
    )?;

    for r in res2 {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

pub(crate) async fn search_by_name(
    db_pool: &Pool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::DeckSimple>> {
    let (mut results, res2) = tokio::try_join!(
        query_search(
            db_pool,
            "select id, kind, name, ts_rank_cd(ts, plainto_tsquery('english', $2)) AS rank_sum
             from decks
             where ts @@ plainto_tsquery('english', $2)
                   and user_id = $1
             order by rank_sum desc
             limit 20",
            user_id,
            query
        ),
        query_search(
            db_pool,
            "select id, kind, name
             from decks
             where name ilike '%' || $2 || '%'
                   and user_id = $1
             limit 20",
            user_id,
            query
        )
    )?;

    for r in res2 {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

async fn query_search_within_deck_kind(
    db_pool: &Pool,
    stmt: &str,
    user_id: Key,
    query: &str,
    dk: &DeckKind,
) -> Result<Vec<interop::DeckSimple>> {
    pg::many_from::<DeckSimple, interop::DeckSimple>(db_pool, &stmt, &[&user_id, &query, &dk]).await
}

async fn query_search(
    db_pool: &Pool,
    stmt: &str,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::DeckSimple>> {
    pg::many_from::<DeckSimple, interop::DeckSimple>(db_pool, &stmt, &[&user_id, &query]).await
}

async fn query_search_id(
    db_pool: &Pool,
    stmt: &str,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckSimple>> {
    pg::many_from::<DeckSimple, interop::DeckSimple>(db_pool, &stmt, &[&user_id, &deck_id]).await
}

fn contains(backrefs: &[interop::DeckSimple], id: Key) -> bool {
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

// tuple where the second element is a bool indicating whether the deck was created (true) or
// we're returning a pre-existing deck (false)
//
pub(crate) async fn deckbase_get_or_create(
    tx: &Transaction<'_>,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<(DeckBase, DeckBaseOrigin)> {
    let existing_deck_res = deckbase_get_by_name(&tx, user_id, kind, &name).await;
    match existing_deck_res {
        Ok(deck) => Ok((deck.into(), DeckBaseOrigin::PreExisting)),
        Err(e) => match e {
            Error::NotFound => {
                let deck = deckbase_create(&tx, user_id, kind, &name).await?;
                Ok((deck.into(), DeckBaseOrigin::Created))
            }
            _ => Err(e),
        },
    }
}

async fn deckbase_get_by_name(
    tx: &Transaction<'_>,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<DeckBase> {
    pg::one_may_not_find::<DeckBase>(
        &tx,
        "select id, name, created_at, graph_terminator
         from decks
         where user_id = $1 and name = $2 and kind = $3",
        &[&user_id, &name, &kind],
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
) -> Result<Vec<interop::DeckSimple>> {
    let deck_kind = resource_string_to_deck_kind_string(resource)?;
    let limit: i32 = 10;

    let stmt = "SELECT id, name, kind
                FROM decks
                WHERE user_id = $1 AND kind = '$deck_kind'::deck_kind
                ORDER BY created_at DESC
                LIMIT $limit";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    pg::many_from::<DeckSimple, interop::DeckSimple>(db_pool, &stmt, &[&user_id]).await
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

// // return all the people, events, publications etc that mention this deck
// // (used for showing backrefs)
// //
// pub(crate) async fn from_decks_via_notes_to_deck_id(
//     db_pool: &Pool,
//     deck_id: Key,
// ) -> Result<Vec<interop::Ref>> {
//     pg::many_from::<DetailedRef, interop::Ref>(
//         db_pool,
//         "SELECT d.id AS id,
//                 d.name AS name,
//                 d.kind,
//                 n.content as note_content,
//                 n.id as note_id,
//                 nd.kind as ref_kind,
//                 nd.annotation as annotation
//          FROM decks d,
//               notes n,
//               notes_decks nd
//          WHERE n.deck_id = d.id
//                AND nd.note_id = n.id
//                AND nd.deck_id = $1
//          ORDER BY nd.deck_id, nd.note_id",
//         &[&deck_id],
//     )
//     .await
// }

// return all notes that have references back to the currently displayed deck
//
pub(crate) async fn backnotes(db_pool: &Pool, deck_id: Key) -> Result<Vec<interop::BackNote>> {
    pg::many_from::<BackNote, interop::BackNote>(
        db_pool,
        "SELECT d.id AS deck_id,
                d.name AS deck_name,
                d.kind as kind,
                n.content as note_content,
                n.id as note_id
         FROM decks d,
              notes n,
              notes_decks nd
         WHERE n.deck_id = d.id
               AND nd.note_id = n.id
               AND nd.deck_id = $1
         ORDER BY nd.deck_id, nd.note_id",
        &[&deck_id],
    )
    .await
}

// all refs on notes that have at least one ref back to the currently displayed deck
//
pub(crate) async fn backrefs(db_pool: &Pool, deck_id: Key) -> Result<Vec<interop::BackRef>> {
    pg::many_from::<BackRef, interop::BackRef>(
        db_pool,
        "SELECT nd.note_id as note_id,
                d.id as deck_id,
                d.kind as kind,
                d.name as deck_name,
                nd2.kind as ref_kind,
                nd2.annotation
         FROM notes_decks nd, notes_decks nd2, decks d
         WHERE nd.deck_id = $1
               AND nd.note_id = nd2.note_id
               AND d.id = nd2.deck_id
               ORDER BY nd2.deck_id",
        &[&deck_id],
    )
    .await
}

// return all the people, events, publications etc mentioned in the given deck
// (used to show refs on left hand margin)
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
                AND nd.deck_id = d.id
         ORDER BY nd.note_id, d.kind DESC, d.name",
        &[&deck_id],
    )
    .await
}
