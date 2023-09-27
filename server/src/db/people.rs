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

use crate::db::decks;
use crate::interop::decks::{DeckKind, Pagination, SlimDeck};
use crate::interop::font::Font;
use crate::interop::people::{Person, ProtoPerson};
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use crate::db::sqlite::{self, FromRow, SqlitePool};
use rusqlite::{params, Row};

impl FromRow for Person {
    fn from_row(row: &Row) -> crate::Result<Person> {
        Ok(Person {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: DeckKind::Person,
            insignia: row.get(2)?,
            font: row.get(3)?,
            sort_date: row.get(4)?,
            points: vec![],
            events: vec![],
            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> crate::Result<Person> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Person,
        title,
        false,
        0,
        Font::English,
        1,
    )?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<Person>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "select d.id,
                d.name,
                d.insignia,
                d.font,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as birth_date
         from decks d, points p
         where d.user_id = ?1
               and d.kind = 'person'
               and p.deck_id = d.id
               and p.kind = 'point_begin'
         union
         select d.id,
                d.name,
                d.insignia,
                d.font,
                null as birth_date
         from decks d
              left join points p on p.deck_id = d.id
         where d.user_id = ?1
               and d.kind = 'person'
               and p.deck_id is null
         order by birth_date",
        params![&user_id],
    )
}

pub(crate) fn uncategorised(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date
                FROM decks d
                LEFT JOIN points p ON p.deck_id = d.id
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id is null
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM decks d
                LEFT JOIN points p ON p.deck_id = d.id
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id is null";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn ancient(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate),
                       date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date < '0354-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM (
                    SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                    FROM decks d, points p
                    WHERE d.user_id = ?1
                          AND d.kind = 'person'
                          AND p.deck_id = d.id
                          AND p.kind = 'point_begin'
                          AND birth_date < '0354-01-01')";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn medieval(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '0354-01-01' AND birth_date < '1469-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM (SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                      FROM decks d, points p
                      WHERE d.user_id = ?1
                            AND d.kind = 'person'
                            AND p.deck_id = d.id
                            AND p.kind = 'point_begin'
                            AND birth_date >= '0354-01-01' AND birth_date < '1469-01-01')";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn modern(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1469-01-01' AND birth_date < '1856-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM (
                    SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                    FROM decks d, points p
                    WHERE d.user_id = ?1
                          AND d.kind = 'person'
                          AND p.deck_id = d.id
                          AND p.kind = 'point_begin'
                          AND birth_date >= '1469-01-01' AND birth_date < '1856-01-01')";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn contemporary(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1856-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM (SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                      FROM decks d, points p
                      WHERE d.user_id = ?1
                            AND d.kind = 'person'
                            AND p.deck_id = d.id
                            AND p.kind = 'point_begin'
                            AND birth_date >= '1856-01-01')";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key, person_id: Key) -> crate::Result<Person> {
    let conn = sqlite_pool.get()?;

    let stmt = "
     SELECT id, name, insignia, font, null as sort_date
     FROM decks
     WHERE user_id = ?1 AND id = ?2 AND kind = ?3";

    let deck: Person = sqlite::one(
        &conn,
        stmt,
        params![&user_id, &person_id, &DeckKind::Person.to_string()],
    )?;

    decks::hit(&conn, person_id)?;

    Ok(deck)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    person: &ProtoPerson,
    person_id: Key,
) -> crate::Result<Person> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        person_id,
        DeckKind::Person,
        &person.title,
        graph_terminator,
        person.insignia,
        person.font,
        person.impact,
    )?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, person_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, person_id)
}
