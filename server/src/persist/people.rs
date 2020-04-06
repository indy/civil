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
use crate::error::{Error, Result};
use crate::interop::dates as dates_interop;
use crate::interop::locations as locations_interop;
use crate::interop::people as interop;
use crate::interop::Key;
use crate::persist::dates;
use crate::persist::decks;
use crate::persist::locations;
use crate::persist::timespans;
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
    age: Option<String>,
    // birth date
    birth_date_id: Option<Key>,
    bd_textual: Option<String>,
    bd_exact_date: Option<chrono::NaiveDate>,
    bd_lower_date: Option<chrono::NaiveDate>,
    bd_upper_date: Option<chrono::NaiveDate>,
    bd_fuzz: Option<f32>,
    // birth location
    birth_location_id: Option<Key>,
    bl_textual: Option<String>,
    bl_longitude: Option<f32>,
    bl_latitude: Option<f32>,
    bl_fuzz: Option<f32>,
    // death date
    death_date_id: Option<Key>,
    dd_textual: Option<String>,
    dd_exact_date: Option<chrono::NaiveDate>,
    dd_lower_date: Option<chrono::NaiveDate>,
    dd_upper_date: Option<chrono::NaiveDate>,
    dd_fuzz: Option<f32>,
    // death location
    death_location_id: Option<Key>,
    dl_textual: Option<String>,
    dl_longitude: Option<f32>,
    dl_latitude: Option<f32>,
    dl_fuzz: Option<f32>,
}

// Person is a direct mapping from the people schema in the db
// a interop::Person can be created from a db::PersonDerived + extra date and location information
//
#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct Person {
    id: Key,
    name: String,
    // age: Option<String>,
    timespan_id: Option<Key>,
    location_id: Option<Key>,
    location2_id: Option<Key>,
    // birth_date_id: Key,
    // birth_location_id: Key,
    // death_date_id: Option<Key>,
    // death_location_id: Option<Key>,
}

impl From<PersonDerived> for interop::Person {
    fn from(e: PersonDerived) -> interop::Person {
        interop::Person {
            id: e.id,
            name: e.name,
            birth_date: dates_interop::try_build(
                e.birth_date_id,
                e.bd_textual,
                e.bd_exact_date,
                e.bd_lower_date,
                e.bd_upper_date,
                e.bd_fuzz,
            ),
            birth_location: locations_interop::try_build(
                e.birth_location_id,
                e.bl_textual,
                e.bl_longitude,
                e.bl_latitude,
                e.bl_fuzz,
            ),
            death_date: dates_interop::try_build(
                e.death_date_id,
                e.dd_textual,
                e.dd_exact_date,
                e.dd_lower_date,
                e.dd_upper_date,
                e.dd_fuzz,
            ),
            death_location: locations_interop::try_build(
                e.death_location_id,
                e.dl_textual,
                e.dl_longitude,
                e.dl_latitude,
                e.dl_fuzz,
            ),
            notes: None,

            tags_in_notes: None,
            decks_in_notes: None,

            linkbacks_to_decks: None,
            linkbacks_to_tags: None,
        }
    }
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    person: &interop::ProtoPerson,
) -> Result<interop::Person> {
    info!("db::create_person");
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let birth_date = dates::create(&tx, &person.birth_date).await?;
    let birth_date_id = birth_date.id;

    let birth_location = locations::create(&tx, &person.birth_location).await?;
    let birth_location_id = birth_location.id;

    let death_date: Option<dates_interop::Date>;
    let death_date_id: Option<Key>;
    if let Some(date) = &person.death_date {
        let res = dates::create(&tx, &date).await?;
        death_date_id = Some(res.id);
        death_date = Some(res);
    } else {
        death_date = None;
        death_date_id = None;
    };

    let death_location: Option<locations_interop::Location>;
    let death_location_id: Option<Key>;
    if let Some(location) = &person.death_location {
        let res = locations::create(&tx, &location).await?;
        death_location_id = Some(res.id);
        death_location = Some(res);
    } else {
        death_location = None;
        death_location_id = None;
    };

    let age: Option<String> = None; // todo: calculate age

    // create timespan
    let timespan_id = timespans::create(&tx, Some(birth_date_id), death_date_id, age).await?;

    let db_person = pg::one::<Person>(
        &tx,
        include_str!("sql/people_create.sql"),
        &[
            &user_id,
            &person.name,
            &timespan_id,
            &birth_location_id,
            &death_location_id, // saved in location2
        ],
    )
    .await?;

    tx.commit().await?;

    Ok(interop::Person {
        id: db_person.id,
        name: db_person.name,
        birth_date: Some(birth_date), // todo: remove options from birth information
        birth_location: Some(birth_location),
        death_date,
        death_location,

        notes: None,

        tags_in_notes: None,
        decks_in_notes: None,

        linkbacks_to_decks: None,
        linkbacks_to_tags: None,
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
    pg::one_from::<PersonDerived, interop::Person>(
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
    let existing_person = get(db_pool, person_id, user_id).await?;

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    if let Some(existing_date) = &existing_person.birth_date {
        let updated_date = &updated_person.birth_date;
        if updated_date != existing_date {
            dates::edit(&tx, &updated_date, existing_date.id).await?;
        }
    }
    if let Some(existing_loc) = &existing_person.birth_location {
        let updated_loc = &updated_person.birth_location;
        if updated_loc != existing_loc {
            locations::edit(&tx, &updated_loc, existing_loc.id).await?;
        }
    }

    // todo: how to create a new death_date/location when there was None before ????

    if let Some(existing_date) = &existing_person.death_date {
        if let Some(updated_date) = &updated_person.death_date {
            if updated_date != existing_date {
                dates::edit(&tx, &updated_date, existing_date.id).await?;
            }
        }
    }

    if let Some(existing_loc) = &existing_person.death_location {
        if let Some(updated_loc) = &updated_person.death_location {
            if updated_loc != existing_loc {
                locations::edit(&tx, &updated_loc, existing_loc.id).await?;
            }
        }
    }

    let _person = pg::one::<Person>(
        &tx,
        include_str!("sql/people_edit.sql"),
        &[&user_id, &person_id, &updated_person.name],
    )
    .await?;

    tx.commit().await?;

    let altered_person = get(db_pool, person_id, user_id).await?;

    Ok(altered_person)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, person_id: Key) -> Result<()> {
    decks::delete(db_pool, person_id, user_id).await
}
