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

use super::pg;
use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::error::{Error, Result};
use crate::interop::people as interop;
use crate::interop::Key;

use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::{error, info};

// PersonDerived contains additional information from tables other than people
// a interop::Person can be created just from a db::PersonDerived
//
#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct PersonDerived {
    id: Key,
    name: String,
    birth_date: Option<chrono::NaiveDate>,
}

impl From<PersonDerived> for interop::Person {
    fn from(e: PersonDerived) -> interop::Person {
        interop::Person {
            id: e.id,
            name: e.name,

            sort_date: e.birth_date,

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

pub(crate) async fn get_or_create(
    db_pool: &Pool,
    user_id: Key,
    title: &str,
) -> Result<interop::Person> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;

    let tx = client.transaction().await?;

    let (deck, _origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Person, &title).await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Person>> {
    pg::many_from::<PersonDerived, interop::Person>(
        db_pool,
        "select d.id,
                d.name,
                coalesce(p.exact_date, p.lower_date) as birth_date
         from decks d, points p
         where d.user_id = $1
               and d.kind = 'person'
               and p.deck_id = d.id
               and p.kind = 'point_begin'::point_kind
         union
         select d.id,
                d.name,
                null as birth_date
         from decks d
              left join points p on p.deck_id = d.id
         where d.user_id = $1
               and d.kind = 'person'
               and p.deck_id is null
         order by birth_date",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, person_id: Key) -> Result<interop::Person> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_get(&tx, user_id, person_id, DeckKind::Person).await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    person: &interop::ProtoPerson,
    person_id: Key,
) -> Result<interop::Person> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let graph_terminator = false;
    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        person_id,
        DeckKind::Person,
        &person.name,
        graph_terminator,
    )
    .await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, person_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, person_id).await
}
