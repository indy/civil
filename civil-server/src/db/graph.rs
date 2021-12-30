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
use crate::db::ref_kind::RefKind;
use crate::error::Result;
use crate::interop::decks as interop_decks;
use crate::interop::graph as interop;
use crate::interop::Key;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct GraphDeck {
    id: Key,
    name: String,
    kind: DeckKind,
    graph_terminator: bool,
}

impl From<GraphDeck> for interop::Graph {
    fn from(p: GraphDeck) -> interop::Graph {
        interop::Graph {
            id: p.id,
            name: String::from(&p.name),
            resource: p.kind.into(),
            graph_terminator: p.graph_terminator,
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
            kind: interop_decks::RefKind::from(v.kind),
            strength: v.strength as usize,
        }
    }
}

pub(crate) async fn get_decks(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Graph>> {
    pg::many_from::<GraphDeck, interop::Graph>(
        db_pool,
        "SELECT id, name, kind, graph_terminator
         FROM decks
         WHERE user_id = $1
         ORDER BY name",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get_connections(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Vertex>> {
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
