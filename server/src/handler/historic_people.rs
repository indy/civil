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

use crate::error::Result;
use crate::handler::decks;
use crate::handler::notes;
use crate::interop::IdParam;
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

pub mod interop {
    use crate::handler::dates::interop::{CreateDate, Date};
    use crate::handler::decks::interop::{DeckMention, DeckReference};
    use crate::handler::locations::interop::{CreateLocation, Location};
    use crate::handler::notes::interop::Note;
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Person {
        pub id: Key,
        pub name: String,
        pub birth_date: Option<Date>, // todo: birth date and location should not be options
        pub birth_location: Option<Location>,
        pub death_date: Option<Date>,
        pub death_location: Option<Location>,

        pub notes: Option<Vec<Note>>,
        pub quotes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<DeckReference>>,
        pub subjects_referenced: Option<Vec<DeckReference>>,

        pub mentioned_by_people: Option<Vec<DeckMention>>,
        pub mentioned_in_subjects: Option<Vec<DeckMention>>,
        pub mentioned_in_articles: Option<Vec<DeckMention>>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreatePerson {
        pub name: String,
        // todo: there should be an age parameter here?
        pub birth_date: CreateDate,
        pub birth_location: CreateLocation,
        pub death_date: Option<CreateDate>,
        pub death_location: Option<CreateLocation>,
    }
}

pub async fn create_person(
    person: Json<interop::CreatePerson>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_person");
    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    // db statement
    let person = db::create(&db_pool, &person, user_id).await?;
    info!("create_person b");

    Ok(HttpResponse::Ok().json(person))
}

pub async fn get_people(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_people");

    let user_id = session::user_id(&session)?;

    // db statement
    let people = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(people))
}

pub async fn get_person(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_person {:?}", params.id);
    let user_id = session::user_id(&session)?;

    // db statements
    let person_id = params.id;
    let mut person = db::get(&db_pool, person_id, user_id).await?;

    let notes = notes::db::all_notes_for(&db_pool, person_id, NoteType::Note).await?;
    person.notes = Some(notes);

    let quotes = notes::db::all_notes_for(&db_pool, person_id, NoteType::Quote).await?;
    person.quotes = Some(quotes);

    let people_referenced = decks::db::referenced_in(
        &db_pool,
        Model::HistoricPerson,
        person_id,
        Model::HistoricPerson,
    )
    .await?;
    person.people_referenced = Some(people_referenced);

    let subjects_referenced =
        decks::db::referenced_in(&db_pool, Model::HistoricPerson, person_id, Model::Subject)
            .await?;
    person.subjects_referenced = Some(subjects_referenced);

    // all the people that mention this person
    let mentioned_by_people = decks::db::that_mention(
        &db_pool,
        Model::HistoricPerson,
        Model::HistoricPerson,
        person_id,
    )
    .await?;
    person.mentioned_by_people = Some(mentioned_by_people);

    // all the subjects that mention this person
    let mentioned_in_subjects =
        decks::db::that_mention(&db_pool, Model::Subject, Model::HistoricPerson, person_id).await?;
    person.mentioned_in_subjects = Some(mentioned_in_subjects);

    // all the articles that mention this person
    let mentioned_in_articles =
        decks::db::that_mention(&db_pool, Model::Article, Model::HistoricPerson, person_id).await?;
    person.mentioned_in_articles = Some(mentioned_in_articles);

    Ok(HttpResponse::Ok().json(person))
}

pub async fn edit_person(
    person: Json<interop::Person>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit_person");

    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    let person = db::edit(&db_pool, &person, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn delete_person(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::error::{Error, Result};
    use crate::handler::dates;
    use crate::handler::decks;
    use crate::handler::locations;
    use crate::handler::timespans;
    use crate::interop::Key;
    use crate::pg;
    use deadpool_postgres::{Client, Pool};
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::{error, info};

    // PersonDerived contains additional information from tables other than historic_people
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

    // Person is a direct mapping from the historic_people schema in the db
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
                birth_date: dates::interop::try_build(
                    e.birth_date_id,
                    e.bd_textual,
                    e.bd_exact_date,
                    e.bd_lower_date,
                    e.bd_upper_date,
                    e.bd_fuzz,
                ),
                birth_location: locations::interop::try_build(
                    e.birth_location_id,
                    e.bl_textual,
                    e.bl_longitude,
                    e.bl_latitude,
                    e.bl_fuzz,
                ),
                death_date: dates::interop::try_build(
                    e.death_date_id,
                    e.dd_textual,
                    e.dd_exact_date,
                    e.dd_lower_date,
                    e.dd_upper_date,
                    e.dd_fuzz,
                ),
                death_location: locations::interop::try_build(
                    e.death_location_id,
                    e.dl_textual,
                    e.dl_longitude,
                    e.dl_latitude,
                    e.dl_fuzz,
                ),
                notes: None,
                quotes: None,

                people_referenced: None,
                subjects_referenced: None,

                mentioned_by_people: None,
                mentioned_in_subjects: None,
                mentioned_in_articles: None,
            }
        }
    }

    pub async fn create(
        db_pool: &Pool,
        person: &interop::CreatePerson,
        user_id: Key,
    ) -> Result<interop::Person> {
        info!("db::create_person");
        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        let birth_date = dates::db::create(&tx, &person.birth_date).await?;
        let birth_date_id = birth_date.id;

        let birth_location = locations::db::create(&tx, &person.birth_location).await?;
        let birth_location_id = birth_location.id;

        let death_date: Option<dates::interop::Date>;
        let death_date_id: Option<Key>;
        if let Some(date) = &person.death_date {
            let res = dates::db::create(&tx, &date).await?;
            death_date_id = Some(res.id);
            death_date = Some(res);
        } else {
            death_date = None;
            death_date_id = None;
        };

        let death_location: Option<locations::interop::Location>;
        let death_location_id: Option<Key>;
        if let Some(location) = &person.death_location {
            let res = locations::db::create(&tx, &location).await?;
            death_location_id = Some(res.id);
            death_location = Some(res);
        } else {
            death_location = None;
            death_location_id = None;
        };

        let age: Option<String> = None; // todo: calculate age

        // create timespan
        let timespan_id =
            timespans::db::create(&tx, Some(birth_date_id), death_date_id, age).await?;

        let db_person = pg::one::<Person>(
            &tx,
            include_str!("../sql/historic_people_create.sql"),
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
            quotes: None,

            people_referenced: None,
            subjects_referenced: None,

            mentioned_by_people: None,
            mentioned_in_subjects: None,
            mentioned_in_articles: None,
        })
    }

    pub async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Person>> {
        pg::many_from::<PersonDerived, interop::Person>(
            db_pool,
            include_str!("../sql/historic_people_all_derived.sql"),
            &[&user_id],
        )
        .await
    }

    pub async fn get(db_pool: &Pool, person_id: Key, user_id: Key) -> Result<interop::Person> {
        pg::one_from::<PersonDerived, interop::Person>(
            db_pool,
            include_str!("../sql/historic_people_get_derived.sql"),
            &[&user_id, &person_id],
        )
        .await
    }

    pub async fn edit(
        db_pool: &Pool,
        updated_person: &interop::Person,
        person_id: Key,
        user_id: Key,
    ) -> Result<interop::Person> {
        let existing_person = get(db_pool, person_id, user_id).await?;

        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        if let Some(existing_date) = &existing_person.birth_date {
            if let Some(updated_date) = &updated_person.birth_date {
                if updated_date != existing_date {
                    dates::db::edit(&tx, &updated_date, existing_date.id).await?;
                }
            }
        }
        if let Some(existing_loc) = &existing_person.birth_location {
            if let Some(updated_loc) = &updated_person.birth_location {
                if updated_loc != existing_loc {
                    locations::db::edit(&tx, &updated_loc, existing_loc.id).await?;
                }
            }
        }

        // todo: how to create a new death_date/location when there was None before ????

        if let Some(existing_date) = &existing_person.death_date {
            if let Some(updated_date) = &updated_person.death_date {
                if updated_date != existing_date {
                    dates::db::edit(&tx, &updated_date, existing_date.id).await?;
                }
            }
        }

        if let Some(existing_loc) = &existing_person.death_location {
            if let Some(updated_loc) = &updated_person.death_location {
                if updated_loc != existing_loc {
                    locations::db::edit(&tx, &updated_loc, existing_loc.id).await?;
                }
            }
        }

        let _db_person = pg::one::<Person>(
            &tx,
            include_str!("../sql/historic_people_edit.sql"),
            &[&user_id, &person_id, &updated_person.name],
        )
        .await?;

        tx.commit().await?;

        let altered_person = get(db_pool, person_id, user_id).await?;

        Ok(altered_person)
    }

    pub async fn delete(db_pool: &Pool, person_id: Key, user_id: Key) -> Result<()> {
        decks::db::delete(db_pool, person_id, user_id).await
    }
}
