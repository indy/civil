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

use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::error::Result;
use crate::interop::people as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

impl From<decks::DeckBase> for interop::Person {
    fn from(e: decks::DeckBase) -> interop::Person {
        interop::Person {
            id: e.id,
            name: e.name,

            sort_date: None,

            points: None,
            all_points_during_life: None,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Row, params};
use crate::db::deck_kind::sqlite_string_from_deck_kind;

fn sqlite_person_with_sortdate_from_row(row: &Row) -> Result<interop::SqlitePerson> {
    Ok(interop::SqlitePerson {
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

fn sqlite_person_from_row(row: &Row) -> Result<interop::SqlitePerson> {
    Ok(interop::SqlitePerson {
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

pub(crate) fn sqlite_get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> Result<interop::SqlitePerson> {

    let conn = sqlite_pool.get()?;

    let (deck, _origin) = decks::sqlite_deckbase_get_or_create(&conn, user_id, DeckKind::Person, &title)?;

    Ok(deck.into())
}

pub(crate) fn sqlite_all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::SqlitePerson>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(&conn,
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
                 sqlite_person_with_sortdate_from_row)
}

pub(crate) fn sqlite_get(sqlite_pool: &SqlitePool, user_id: Key, person_id: Key) -> Result<interop::SqlitePerson> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(&conn,
                           decks::DECKBASE_QUERY,
                           params![&user_id, &person_id, &sqlite_string_from_deck_kind(DeckKind::Person)],
                           sqlite_person_from_row)?;

    Ok(deck.into())
}

pub(crate) fn sqlite_edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    person: &interop::ProtoPerson,
    person_id: Key,
) -> Result<interop::SqlitePerson> {
    let conn = sqlite_pool.get()?;

    let graph_terminator = false;
    let deck = decks::sqlite_deckbase_edit(
        &conn,
        user_id,
        person_id,
        DeckKind::Person,
        &person.name,
        graph_terminator,
    )?;

    Ok(deck.into())
}

pub(crate) fn sqlite_delete(sqlite_pool: &SqlitePool, user_id: Key, person_id: Key) -> Result<()> {
    decks::sqlite_delete(sqlite_pool, user_id, person_id)
}
