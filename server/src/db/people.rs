// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

// Person is a direct mapping from the people schema in the db
// a interop::Person can be created from a db::PersonDerived + extra date and location information
//
#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct Person {
    id: Key,
    name: String,
}

impl From<Person> for interop::Person {
    fn from(e: Person) -> interop::Person {
        interop::Person {
            id: e.id,
            name: e.name,

            sort_date: None,

            points: None,
            all_points_during_life: None,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    person: &interop::ProtoPerson,
) -> Result<interop::Person> {
    info!("db::create_person");
    // info!("{:?}", person);

    let db_person = pg::one_non_transactional::<Person>(
        &db_pool,
        include_str!("sql/people_create.sql"),
        &[&user_id, &person.name],
    )
    .await?;

    Ok(interop::Person {
        id: db_person.id,
        name: db_person.name,

        sort_date: None,
        points: None,
        all_points_during_life: None,

        notes: None,
        decks_in_notes: None,
        linkbacks_to_decks: None,
    })
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Person>> {
    pg::many_from::<PersonDerived, interop::Person>(
        db_pool,
        include_str!("sql/people_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, person_id: Key) -> Result<interop::Person> {
    pg::one_from::<Person, interop::Person>(
        db_pool,
        include_str!("sql/people_get.sql"),
        &[&user_id, &person_id],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    updated_person: &interop::ProtoPerson,
    person_id: Key,
) -> Result<interop::Person> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        include_str!("sql/people_edit.sql"),
        &[&user_id, &person_id, &updated_person.name],
    )
    .await?;

    tx.commit().await?;

    let altered_person = get(db_pool, user_id, person_id).await?;

    Ok(altered_person)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, person_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, person_id).await
}
