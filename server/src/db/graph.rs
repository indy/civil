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

use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::decks as interop_decks;
use crate::interop::graph as interop;
use crate::interop::Key;

use rusqlite::{params, Row};
use std::str::FromStr;
#[allow(unused_imports)]
use tracing::info;

fn graph_from_row(row: &Row) -> Result<interop::Graph> {
    let kind: String = row.get(2)?;

    Ok(interop::Graph {
        id: row.get(0)?,
        name: row.get(1)?,
        deck_kind: interop_decks::DeckKind::from_str(&kind)?,
        graph_terminator: row.get(3)?,
    })
}

pub(crate) fn get_decks(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Graph>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT id, name, kind, graph_terminator
         FROM decks
         WHERE user_id = ?1
         ORDER BY name",
        params![&user_id],
        graph_from_row,
    )
}

fn vertex_from_row(row: &Row) -> Result<interop::Vertex> {
    let refk: String = row.get(2)?;

    Ok(interop::Vertex {
        from_id: row.get(0)?,
        to_id: row.get(1)?,
        kind: interop_decks::RefKind::from_str(&refk)?,
        strength: row.get(3)?,
    })
}

pub(crate) fn get_connections(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> Result<Vec<interop::Vertex>> {
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
        vertex_from_row,
    )
}
