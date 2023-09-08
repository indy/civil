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

use crate::db::decks::slimdeck_from_row;
use crate::db::sqlite::{self, SqlitePool};
use crate::interop::decks as interop_decks;
use crate::interop::font::Font;
use crate::interop::graph as interop;
use crate::interop::graph::{Direction, Edge, EdgeData, LineStyle};
use crate::interop::Key;

use std::collections::{HashMap, HashSet};

use rusqlite::{params, Connection, Row};
use std::str::FromStr;
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

    let rk: String = row.get(1)?;
    let knd: String = row.get(4)?;
    let f: i32 = row.get(7)?;

    Ok(Connectivity {
        direction,
        ref_kind: interop_decks::RefKind::from_str(&rk)?,
        deck_id: row.get(2)?,
        title: row.get(3)?,

        deck_kind: interop_decks::DeckKind::from_str(&knd)?,
        graph_terminator: row.get(5)?,
        insignia: row.get(6)?,
        font: Font::try_from(f)?,
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
        line_style: edge.line_style,
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
) -> crate::Result<interop::EdgeData> {
    let conn = sqlite_pool.get()?;

    let mut decks_map: HashMap<Key, interop_decks::SlimDeck> = HashMap::new();
    let mut edges_map: HashMap<(Key, Key, Direction), Edge> = HashMap::new();

    let direct_neighbours = neighbours(&conn, user_id, deck_id)?;
    let mut direct_neighbours_keys = HashSet::new();

    for connectivity in &direct_neighbours {
        add_edge(
            &mut edges_map,
            Edge {
                from_id: deck_id,
                to_id: connectivity.deck_id,
                ref_kind: connectivity.ref_kind,
                direction: connectivity.direction,
                line_style: LineStyle::Solid,
            },
        );

        direct_neighbours_keys.insert(connectivity.deck_id);

        decks_map.insert(
            connectivity.deck_id,
            slimdeck_from_connectivity(connectivity),
        );
    }

    let mut visited = HashSet::new();
    for connectivity in &direct_neighbours {
        if !visited.contains(&connectivity.deck_id) {
            visited.insert(connectivity.deck_id);

            let n = neighbours(&conn, user_id, connectivity.deck_id)?;
            for c in &n {
                if c.deck_id == deck_id {
                    // ignore as this is linking back to the origin deck and we already know about this connection
                } else if direct_neighbours_keys.contains(&c.deck_id) {
                    // an edge between two distance 1 nodes
                    //
                    add_edge(
                        &mut edges_map,
                        Edge {
                            from_id: connectivity.deck_id,
                            to_id: c.deck_id,
                            ref_kind: c.ref_kind,
                            direction: c.direction,
                            line_style: LineStyle::Solid,
                        },
                    );
                } else {
                    // an edge between a distance 1 node and a distance 2 node
                    add_edge(
                        &mut edges_map,
                        Edge {
                            from_id: connectivity.deck_id,
                            to_id: c.deck_id,
                            ref_kind: c.ref_kind,
                            direction: c.direction,
                            line_style: LineStyle::Dotted,
                        },
                    );
                    decks_map.insert(c.deck_id, slimdeck_from_connectivity(c));
                }
            }
        }
    }

    let decks = decks_map.values().map(fucking_copy_slimdeck).collect();
    let edges = edges_map.values().map(fucking_copy_edge).collect();

    Ok(EdgeData { edges, decks })
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

pub(crate) fn get_decks(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Vec<interop_decks::SlimDeck>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT id, name, kind, insignia, font, graph_terminator
         FROM decks
         WHERE user_id = ?1
         ORDER BY name",
        params![&user_id],
        slimdeck_from_row,
    )
}

fn vertex_from_row(row: &Row) -> crate::Result<interop::OldVertex> {
    let refk: String = row.get(2)?;

    Ok(interop::OldVertex {
        from_id: row.get(0)?,
        to_id: row.get(1)?,
        kind: interop_decks::RefKind::from_str(&refk)?,
        strength: row.get(3)?,
    })
}

pub(crate) fn get_connections(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Vec<interop::OldVertex>> {
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
