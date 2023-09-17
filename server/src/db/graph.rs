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

use crate::db::decks::get_slimdeck;
use crate::db::sqlite::{self, SqlitePool};
use crate::interop::decks as interop_decks;
use crate::interop::font::Font;
use crate::interop::graph as interop;
use crate::interop::graph::{ConnectivityData, Direction, Edge};
use crate::interop::Key;

use std::collections::HashMap;

use rusqlite::{params, Connection, Row};
#[allow(unused_imports)]
use tracing::info;

struct Connectivity {
    direction: Direction,

    ref_kind: interop_decks::RefKind,

    deck_id: Key,
    title: String,
    deck_kind: interop_decks::DeckKind,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
}

fn connectivity_from_row(row: &Row) -> crate::Result<Connectivity> {
    let d: i32 = row.get(0)?;
    let direction: Direction = if d == 0 {
        Direction::Incoming
    } else {
        Direction::Outgoing
    };

    Ok(Connectivity {
        direction,
        ref_kind: row.get(1)?,
        deck_id: row.get(2)?,
        title: row.get(3)?,

        deck_kind: row.get(4)?,
        graph_terminator: row.get(5)?,
        insignia: row.get(6)?,
        font: row.get(7)?,
    })
}

fn slimdeck_from_connectivity(connectivity: &Connectivity) -> interop_decks::SlimDeck {
    interop_decks::SlimDeck {
        id: connectivity.deck_id,
        title: String::from(&connectivity.title),
        deck_kind: connectivity.deck_kind,
        insignia: connectivity.insignia,
        font: connectivity.font,
        graph_terminator: connectivity.graph_terminator,
    }
}

fn fucking_copy_slimdeck(slimdeck: &interop_decks::SlimDeck) -> interop_decks::SlimDeck {
    interop_decks::SlimDeck {
        id: slimdeck.id,
        title: String::from(&slimdeck.title),
        deck_kind: slimdeck.deck_kind,
        insignia: slimdeck.insignia,
        font: slimdeck.font,
        graph_terminator: slimdeck.graph_terminator,
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
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<interop::ConnectivityData> {
    let conn = sqlite_pool.get()?;

    let source_deck = get_slimdeck(&conn, user_id, deck_id)?;

    let mut decks_map: HashMap<Key, interop_decks::SlimDeck> = HashMap::new();
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

fn neighbours(conn: &Connection, user_id: Key, deck_id: Key) -> crate::Result<Vec<Connectivity>> {
    // 'incoming query' union 'outgoing query'
    //
    let res = sqlite::many(
        conn,
        "SELECT 0, nd.kind, d.id, d.name, d.kind, d.graph_terminator, d.insignia, d.font
         FROM notes_decks nd, notes n, decks d
         WHERE nd.deck_id = ?2
               AND n.id = nd.note_id
               AND d.id = n.deck_id
         AND d.user_id = ?1
         UNION
         SELECT 1, nd.kind, d.id, d.name, d.kind, d.graph_terminator, d.insignia, d.font
         FROM notes n, notes_decks nd, decks d
         WHERE n.deck_id = ?2
               AND nd.note_id = n.id
               AND d.id = nd.deck_id
               AND d.user_id = ?1",
        params![&user_id, &deck_id],
        connectivity_from_row,
    )?;

    Ok(res)
}
