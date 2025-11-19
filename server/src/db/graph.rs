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

use crate::db::DbError;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, RefKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::graph::{ConnectivityData, Direction, Edge};

use std::collections::HashMap;

use rusqlite::types::{FromSql, FromSqlResult, ValueRef};
use rusqlite::{Connection, Row, named_params};

#[allow(unused_imports)]
use tracing::info;

struct Connectivity {
    direction: Direction,
    ref_kind: RefKind,
    deck_id: Key,
    title: String,
    deck_kind: DeckKind,
    created_at: chrono::NaiveDateTime,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
    impact: i32,
}

impl FromSql for Direction {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let i = value.as_i64()?;
        match i {
            0 => Ok(Direction::Incoming),
            _ => Ok(Direction::Outgoing),
        }
    }
}

impl FromRow for Connectivity {
    fn from_row(row: &Row) -> rusqlite::Result<Connectivity> {
        Ok(Connectivity {
            direction: row.get("direction")?,
            ref_kind: row.get("ref_kind")?,
            deck_id: row.get("deck_id")?,
            title: row.get("name")?,
            deck_kind: row.get("deck_kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,
        })
    }
}

fn slimdeck_from_connectivity(connectivity: &Connectivity) -> SlimDeck {
    SlimDeck {
        id: connectivity.deck_id,
        title: String::from(&connectivity.title),
        deck_kind: connectivity.deck_kind,
        created_at: connectivity.created_at,
        graph_terminator: connectivity.graph_terminator,
        insignia: connectivity.insignia,
        font: connectivity.font,
        impact: connectivity.impact,
    }
}

fn fucking_copy_slimdeck(slimdeck: &SlimDeck) -> SlimDeck {
    SlimDeck {
        id: slimdeck.id,
        title: String::from(&slimdeck.title),
        deck_kind: slimdeck.deck_kind,
        created_at: slimdeck.created_at,
        graph_terminator: slimdeck.graph_terminator,
        insignia: slimdeck.insignia,
        font: slimdeck.font,
        impact: slimdeck.impact,
    }
}
fn fucking_copy_edge(edge: &Edge) -> Edge {
    Edge {
        from_id: edge.from_id,
        to_id: edge.to_id,
        ref_kind: edge.ref_kind,
        direction: edge.direction,
    }
}

fn add_edge(edges_map: &mut HashMap<(Key, Key, Direction), Edge>, edge: Edge) {
    fn reverse_direction(direction: Direction) -> Direction {
        match direction {
            Direction::Incoming => Direction::Outgoing,
            Direction::Outgoing => Direction::Incoming,
        }
    }

    fn generate_edges_map_key(a: Key, b: Key, dir: Direction) -> (Key, Key, Direction) {
        if a < b {
            (a, b, dir)
        } else {
            (b, a, reverse_direction(dir))
        }
    }

    // the key to the edges_map hashmap is a (Key, Key, Direction) tuple
    // where the 1st key should always be less than the 2nd key
    // if this requires swapping them around then the direction should also be reversed
    //
    let edges_map_key = generate_edges_map_key(edge.from_id, edge.to_id, edge.direction);
    edges_map.insert(edges_map_key, edge);
}

pub(crate) fn get(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<ConnectivityData, DbError> {
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = :user_id AND id = :deck_id";
    let source_deck: SlimDeck = sqlite::one(
        conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": deck_id},
    )?;

    let mut decks_map: HashMap<Key, SlimDeck> = HashMap::new();
    let mut edges_map: HashMap<(Key, Key, Direction), Edge> = HashMap::new();

    let direct_neighbours = neighbours(&conn, user_id, deck_id)?;

    for connectivity in &direct_neighbours {
        add_edge(
            &mut edges_map,
            Edge {
                from_id: deck_id,
                to_id: connectivity.deck_id,
                ref_kind: connectivity.ref_kind,
                direction: connectivity.direction,
            },
        );

        decks_map.insert(
            connectivity.deck_id,
            slimdeck_from_connectivity(connectivity),
        );
    }

    let decks = decks_map.values().map(fucking_copy_slimdeck).collect();
    let edges = edges_map.values().map(fucking_copy_edge).collect();

    Ok(ConnectivityData {
        source_deck,
        edges,
        decks,
    })
}

fn neighbours(conn: &Connection, user_id: Key, deck_id: Key) -> Result<Vec<Connectivity>, DbError> {
    // 'incoming query' union 'outgoing query'
    //
    sqlite::many(
        conn,
        "SELECT 0 as direction, r.kind as ref_kind, d.id as deck_id, d.name as name, d.kind as deck_kind, d.created_at as created_at, d.graph_terminator as graph_terminator, d.insignia as insignia, d.font as font, d.impact as impact
         FROM refs r, notes n, decks d
         WHERE r.deck_id = :deck_id
               AND n.id = r.note_id
               AND d.id = n.deck_id
               AND d.user_id = :user_id
         UNION
         SELECT 1 as direction, r.kind as ref_kind, d.id as deck_id, d.name as name, d.kind as deck_kind, d.created_at as created_at, d.graph_terminator as graph_terminator, d.insignia as insignia, d.font as font, d.impact as impact
         FROM notes n, refs r, decks d
         WHERE n.deck_id = :deck_id
               AND r.note_id = n.id
               AND d.id = r.deck_id
               AND d.user_id = :user_id",
        named_params!{":user_id": user_id, ":deck_id": deck_id}
    )
}
