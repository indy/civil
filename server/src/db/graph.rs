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

use crate::db::deck_kind::{DeckKind, deck_kind_from_sqlite_string};
use crate::db::ref_kind::{RefKind, ref_kind_from_sqlite_string};
use crate::error::Result;
use crate::interop::decks as interop_decks;
use crate::interop::graph as interop;
use crate::interop::Key;
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

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Row, params};


fn graph_from_row(row: &Row) -> Result<interop::Graph> {
    let kind: String = row.get(2)?;
    let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;

    Ok(interop::Graph {
        id: row.get(0)?,
        name: row.get(1)?,
        resource: interop_decks::DeckResource::from(deck_kind),
        graph_terminator: row.get(3)?,
    })
}

pub(crate) fn sqlite_get_decks(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Graph>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT id, name, kind, graph_terminator
         FROM decks
         WHERE user_id = ?1
         ORDER BY name",
        params![&user_id],
        graph_from_row
    )
}

fn vertex_from_row(row: &Row) -> Result<interop::Vertex> {
    let refk: String = row.get(2)?;
    let ref_kind = ref_kind_from_sqlite_string(refk.as_str())?;

    Ok(interop::Vertex {
        from_id: row.get(0)?,
        to_id: row.get(1)?,
        kind: interop_decks::RefKind::from(ref_kind),
        strength: row.get(3)?,
    })
}

pub(crate) fn sqlite_get_connections(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Vertex>> {
    let conn = sqlite_pool.get()?;
    sqlite::many(
        &conn,
        "select d.id as from_id, nd.deck_id as to_id, nd.kind, count(*) as strength
         from notes_decks nd, decks d, notes n
         where nd.note_id = n.id
               and n.deck_id = d.id
               and d.user_id = ?1
         group by from_id, to_id, nd.kind
         order by from_id",
        params![&user_id],
        vertex_from_row
    )
}
