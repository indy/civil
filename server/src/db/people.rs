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
use crate::interop::decks::DeckKind;
use crate::interop::font::Font;
use crate::interop::people as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Row};

fn person_with_sortdate_from_row(row: &Row) -> crate::Result<interop::Person> {
    let fnt: i32 = row.get(4)?;

    Ok(interop::Person {
        id: row.get(0)?,
        title: row.get(1)?,
        insignia: row.get(3)?,
        font: Font::try_from(fnt)?,
        sort_date: row.get(2)?,
        points: None,
        notes: None,
        refs: None,
        backnotes: None,
        backrefs: None,
        flashcards: None,
    })
}

fn person_from_row(row: &Row) -> crate::Result<interop::Person> {
    let fnt: i32 = row.get(5)?;

    Ok(interop::Person {
        id: row.get(0)?,
        title: row.get(1)?,
        insignia: row.get(4)?,
        font: Font::try_from(fnt)?,
        sort_date: None,
        points: None,
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
) -> crate::Result<interop::Person> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Person, title, Font::English)?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<interop::Person>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "select d.id,
                d.name,
                coalesce(date(p.exact_realdate), date(p.lower_realdate)) as birth_date,
                d.insignia,
                d.font
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

pub(crate) fn listings(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<interop::PeopleListings> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT d.id, d.name, 'person', d.insignia, d.font
                FROM decks d
                LEFT JOIN points p ON p.deck_id = d.id
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id is null";
    let uncategorised = sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', d.insignia, d.font, COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date < '0354-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)";
    let ancient = sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', d.insignia, d.font, COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '0354-01-01' AND birth_date < '1469-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)";
    let medieval = sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', d.insignia, d.font, COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1469-01-01' AND birth_date < '1856-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)";
    let modern = sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)?;

    let stmt = "SELECT d.id, d.name, 'person', d.insignia, d.font, COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date
                FROM decks d, points p
                WHERE d.user_id = ?1
                      AND d.kind = 'person'
                      AND p.deck_id = d.id
                      AND p.kind = 'point_begin'
                      AND birth_date >= '1856-01-01'
                ORDER BY COALESCE(p.exact_realdate, p.lower_realdate)";
    let contemporary = sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)?;

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
) -> crate::Result<interop::Person> {
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
) -> crate::Result<interop::Person> {
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
    )?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, person_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, person_id)
}
