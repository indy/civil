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
use crate::error::Result;
use crate::interop::decks::DeckKind;
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
    let conn = sqlite_pool.get()?;

    let (deck, _origin) = decks::deckbase_get_or_create(&conn, user_id, DeckKind::Person, &title)?;

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

    Ok(deck.into())
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
