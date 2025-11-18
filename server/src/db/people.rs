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
use crate::db::decks;
use crate::db::notes as notes_db;
use crate::db::points as points_db;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, Pagination, ProtoSlimDeck, SlimDeck};
use crate::interop::font::Font;
use crate::interop::people::Person;
use rusqlite::{Row, named_params};

#[allow(unused_imports)]
use tracing::{error, info};

impl FromRow for Person {
    fn from_row(row: &Row) -> rusqlite::Result<Person> {
        Ok(Person {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,
            sort_date: row.get(8)?,
            points: vec![],
            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Person, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Person,
        &title,
        false,
        0,
        Font::Serif,
        1,
    )?;

    tx.commit()?;

    let mut person: Person = deck.into();

    person.points = points_db::all_points_during_life(conn, user_id, person.id)?;
    person.notes = notes_db::notes_for_deck(conn, person.id)?;
    person.arrivals = notes_db::arrivals_for_deck(conn, person.id)?;

    Ok(person)
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Person>, DbError> {
    let stmt = "select d.id,
                d.name,
                d.kind,
                d.created_at,
                d.graph_terminator
                d.insignia,
                d.font,
                d.impact,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as birth_date
         from decks d, points p
         where d.user_id = :user_id
               and d.kind = :deck_kind
               and p.deck_id = d.id
               and p.kind = 'point_begin'
         union
         select d.id,
                d.name,
                d.kind,
                d.created_at,
                d.graph_terminator
                d.insignia,
                d.font,
                d.impact,
                null as birth_date
         from decks d
              left join points p on p.deck_id = d.id
         where d.user_id = :user_id
               and d.kind = :deck_kind
               and p.deck_id is null
         order by birth_date";

    sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )
}

pub(crate) fn paginated_uncategorised(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let stmt = "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date
                FROM decks d
                LEFT JOIN points p ON p.deck_id = d.id
                WHERE d.user_id = :user_id
                      AND d.kind = :deck_kind
                      AND p.deck_id is null
                LIMIT :limit
                OFFSET :offset";

    let items = sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":limit": num_items, ":offset": offset},
    )?;

    let stmt = "SELECT count(*)
                FROM decks d
                LEFT JOIN points p ON p.deck_id = d.id
                WHERE d.user_id = :user_id
                      AND d.kind = :deck_kind
                      AND p.deck_id is null";

    let total_items = sqlite::one(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_ancient(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate),
                       date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = :user_id
                      AND d.kind = :deck_kind
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date < '0354-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT :limit
                OFFSET :offset";

    let items = sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":limit": num_items, ":offset": offset},
    )?;

    let stmt = "SELECT count(*)
                FROM (
                    SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                    FROM decks d, points p
                    WHERE d.user_id = :user_id
                          AND d.kind = :deck_kind
                          AND p.deck_id = d.id
                          AND p.kind = 'point_begin'
                          AND birth_date < '0354-01-01')";

    let total_items = sqlite::one(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_medieval(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = :user_id
                      AND d.kind = :deck_kind
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '0354-01-01' AND birth_date < '1469-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT :limit
                OFFSET :offset";

    let items = sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":limit": num_items, ":offset": offset},
    )?;

    let stmt = "SELECT count(*)
                FROM (SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                      FROM decks d, points p
                      WHERE d.user_id = :user_id
                            AND d.kind = :deck_kind
                            AND p.deck_id = d.id
                            AND p.kind = 'point_begin'
                            AND birth_date >= '0354-01-01' AND birth_date < '1469-01-01')";

    let total_items = sqlite::one(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_modern(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = :user_id
                      AND d.kind = :deck_kind
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1469-01-01' AND birth_date < '1856-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT :limit
                OFFSET :offset";

    let items = sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":limit": num_items, ":offset": offset},
    )?;

    let stmt = "SELECT count(*)
                FROM (
                    SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                    FROM decks d, points p
                    WHERE d.user_id = :user_id
                          AND d.kind = :deck_kind
                          AND p.deck_id = d.id
                          AND p.kind = 'point_begin'
                          AND birth_date >= '1469-01-01' AND birth_date < '1856-01-01')";

    let total_items = sqlite::one(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_contemporary(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let stmt =
        "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, null as sort_date,
                       COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = :user_id
                      AND d.kind = :deck_kind
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1856-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)
                LIMIT :limit
                OFFSET :offset";

    let items = sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":limit": num_items, ":offset": offset},
    )?;

    let stmt = "SELECT count(*)
                FROM (SELECT COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                      FROM decks d, points p
                      WHERE d.user_id = :user_id
                            AND d.kind = :deck_kind
                            AND p.deck_id = d.id
                            AND p.kind = 'point_begin'
                            AND birth_date >= '1856-01-01')";

    let total_items = sqlite::one(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    person_id: Key,
) -> Result<Option<Person>, DbError> {
    // can't use DECKBASE_QUERY since the FromRow trait for Person will try and read the sort_date
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact, null as sort_date
     FROM decks
     WHERE user_id = :user_id AND id = :deck_id AND kind = :deck_kind";
    let mut person: Option<Person> = sqlite::one_optional(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": person_id, ":deck_kind": DeckKind::Person},
    )?;

    if let Some(ref mut p) = person {
        p.points = points_db::all_points_during_life(conn, user_id, person_id)?;
        p.notes = notes_db::notes_for_deck(conn, person_id)?;
        p.arrivals = notes_db::arrivals_for_deck(conn, person_id)?;
        decks::hit(&conn, person_id)?;
    }

    Ok(person)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    person: ProtoSlimDeck,
    person_id: Key,
) -> Result<Person, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        person_id,
        DeckKind::Person,
        &person.title,
        person.graph_terminator,
        person.insignia,
        person.font,
        person.impact,
    )?;

    tx.commit()?;

    let mut person: Person = deck.into();

    person.points = points_db::all_points_during_life(conn, user_id, person.id)?;
    person.notes = notes_db::notes_for_deck(conn, person_id)?;
    person.arrivals = notes_db::arrivals_for_deck(conn, person_id)?;

    Ok(person)
}
