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

use crate::db::{decks, fix_bc_sort_order};
use crate::error::Result;
use crate::interop::decks::{DeckKind, DeckSimple};
use crate::interop::people as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Row};

fn person_with_sortdate_from_row(row: &Row) -> Result<interop::Person> {
    Ok(interop::Person {
        id: row.get(0)?,
        name: row.get(1)?,
        sort_date: row.get(2)?,
        points: None,
        all_points_during_life: None,
        notes: None,
        refs: None,
        backnotes: None,
        backrefs: None,
        flashcards: None,
    })
}

fn person_from_row(row: &Row) -> Result<interop::Person> {
    Ok(interop::Person {
        id: row.get(0)?,
        name: row.get(1)?,
        sort_date: None,
        points: None,
        all_points_during_life: None,
        notes: None,
        refs: None,
        backnotes: None,
        backrefs: None,
        flashcards: None,
    })
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> Result<interop::Person> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(&tx, user_id, DeckKind::Person, title)?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Person>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "select d.id,
                d.name,
                coalesce(p.exact_date, p.lower_date) as birth_date
         from decks d, points p
         where d.user_id = ?1
               and d.kind = 'person'
               and p.deck_id = d.id
               and p.kind = 'point_begin'
         union
         select d.id,
                d.name,
                null as birth_date
         from decks d
              left join points p on p.deck_id = d.id
         where d.user_id = ?1
               and d.kind = 'person'
               and p.deck_id is null
         order by birth_date",
        params![&user_id],
        person_with_sortdate_from_row,
    )
}

use std::str::FromStr;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeckSimpleDate {
    pub id: Key,
    pub name: String,
    pub resource: DeckKind,
    pub birth_date: Option<chrono::NaiveDate>,
}

pub(crate) fn decksimpledate_from_row(row: &Row) -> Result<DeckSimpleDate> {
    let res: String = row.get(2)?;
    Ok(DeckSimpleDate {
        id: row.get(0)?,
        name: row.get(1)?,
        resource: DeckKind::from_str(&res)?,
        birth_date: row.get(3)?,
    })
}

impl From<DeckSimpleDate> for DeckSimple {
    fn from(ds: DeckSimpleDate) -> DeckSimple {
        DeckSimple {
            id: ds.id,
            name: ds.name,
            resource: ds.resource,
        }
    }
}

pub(crate) fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::PeopleListings> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT d.id, d.name, 'person'
                FROM decks d
                LEFT JOIN points p ON p.deck_id = d.id
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id is null";
    let uncategorised = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', COALESCE(p.exact_date, p.lower_date) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date < '0354-01-01'
                ORDER BY birth_date";
    // let ancient = sqlite::many(&conn, &stmt, params![&user_id], decks::decksimple_from_row)?;

    // bug: sqlite incorrectly sorts dates that begin in BC (it ignores the minus in the year)
    // fix: 1. extract all DeckSimples with a negative date
    //      2. reverse them
    //      3. add them to the beginning of the Vec
    let ancient_buggy = sqlite::many(&conn, stmt, params![&user_id], decksimpledate_from_row)?;


    fn grab_date(d: &DeckSimpleDate) -> Option<chrono::NaiveDate> {
        d.birth_date
    }
    let ancient_fixed = fix_bc_sort_order::<DeckSimpleDate>(ancient_buggy, grab_date);
    let ancient = ancient_fixed.into_iter().map(DeckSimple::from).collect();

    let stmt = "SELECT d.id, d.name, 'person', COALESCE(p.exact_date, p.lower_date) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '0354-01-01' AND birth_date < '1469-01-01'
                ORDER BY birth_date";
    let medieval = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', COALESCE(p.exact_date, p.lower_date) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1469-01-01' AND birth_date < '1856-01-01'
                ORDER BY birth_date";
    let modern = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', COALESCE(p.exact_date, p.lower_date) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1856-01-01'
                ORDER BY birth_date";
    let contemporary = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    Ok(interop::PeopleListings {
        uncategorised,
        ancient,
        medieval,
        modern,
        contemporary,
    })
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    person_id: Key,
) -> Result<interop::Person> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(
        &conn,
        decks::DECKBASE_QUERY,
        params![&user_id, &person_id, &DeckKind::Person.to_string()],
        person_from_row,
    )?;

    decks::hit(&conn, person_id)?;

    Ok(deck)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    person: &interop::ProtoPerson,
    person_id: Key,
) -> Result<interop::Person> {
    let conn = sqlite_pool.get()?;

    let graph_terminator = false;
    let deck = decks::deckbase_edit(
        &conn,
        user_id,
        person_id,
        DeckKind::Person,
        &person.name,
        graph_terminator,
    )?;

    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, person_id: Key) -> Result<()> {
    decks::delete(sqlite_pool, user_id, person_id)
}
