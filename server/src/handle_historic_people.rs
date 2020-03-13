// Copyright (C) 2020 Inderjit Gill <email@indy.io>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::error::Result;
use crate::handle_articles;
use crate::handle_notes;
use crate::handle_subjects;
use crate::interop::{IdParam, Key};
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

pub mod interop {
    use crate::handle_articles::interop::ArticleMention;
    use crate::handle_dates::interop::{CreateDate, Date};
    use crate::handle_locations::interop::{CreateLocation, Location};
    use crate::handle_notes::interop::Note;
    use crate::handle_subjects::interop::{SubjectMention, SubjectReference};
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

        pub people_referenced: Option<Vec<PersonReference>>,
        pub subjects_referenced: Option<Vec<SubjectReference>>,

        pub mentioned_by_people: Option<Vec<PersonMention>>,
        pub mentioned_in_subjects: Option<Vec<SubjectMention>>,
        pub mentioned_in_articles: Option<Vec<ArticleMention>>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreatePerson {
        pub name: String,
        pub birth_date: CreateDate,
        pub birth_location: CreateLocation,
        pub death_date: Option<CreateDate>,
        pub death_location: Option<CreateLocation>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct PersonReference {
        pub note_id: Key,
        pub person_id: Key,
        pub person_name: String,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct PersonMention {
        pub person_id: Key,
        pub person_name: String,
    }
}

pub async fn create_person(
    person: Json<interop::CreatePerson>,
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_person");
    let person = person.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    info!("{:?}", &person);

    // todo: trying out returning a interop::person from the db layer
    //       otherwise constructing one later may require extra db queries

    // db statement
    let interop_person: interop::Person = db::create_person(&db_pool, &person, user_id).await?;

    Ok(HttpResponse::Ok().json(interop_person))
    // Ok(HttpResponse::Ok().json(interop::Person::from(db_person)))
    // Ok(HttpResponse::Ok().json(true))
}

pub async fn get_people(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_people");
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // db statement
    let people = db::get_people(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(people))
}

pub async fn get_person(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_person {:?}", params.id);
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // db statements
    let person_id = params.id;
    let mut person = db::get_person(&db_pool, person_id, user_id).await?;

    let notes =
        handle_notes::db::all_notes_for(&db_pool, Model::HistoricPerson, person_id, NoteType::Note)
            .await?;
    person.notes = Some(notes);

    let quotes = handle_notes::db::all_notes_for(
        &db_pool,
        Model::HistoricPerson,
        person_id,
        NoteType::Quote,
    )
    .await?;
    person.quotes = Some(quotes);

    let people_referenced =
        db::get_people_referenced(&db_pool, Model::HistoricPerson, person_id).await?;
    person.people_referenced = Some(people_referenced);

    let subjects_referenced =
        handle_subjects::db::get_subjects_referenced(&db_pool, Model::HistoricPerson, person_id)
            .await?;
    person.subjects_referenced = Some(subjects_referenced);

    let mentioned_by_people =
        db::people_that_mention(&db_pool, Model::HistoricPerson, person_id).await?;
    person.mentioned_by_people = Some(mentioned_by_people);

    let mentioned_in_subjects =
        handle_subjects::db::subjects_that_mention(&db_pool, Model::HistoricPerson, person_id)
            .await?;
    person.mentioned_in_subjects = Some(mentioned_in_subjects);

    let mentioned_in_articles =
        handle_articles::db::articles_that_mention(&db_pool, Model::HistoricPerson, person_id)
            .await?;
    person.mentioned_in_articles = Some(mentioned_in_articles);

    Ok(HttpResponse::Ok().json(person))
}

pub async fn edit_person(
    person: Json<interop::Person>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    let person = db::edit_person(&db_pool, &person, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(person))
}

pub async fn delete_person(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_person(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::edge_type::{self, EdgeType};
    use crate::error::Result;
    use crate::handle_dates;
    use crate::handle_edges;
    use crate::handle_locations;
    use crate::handle_notes;
    use crate::interop::Key;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::{error, info};

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "historic_people")]
    struct PersonReference {
        note_id: Key,
        person_id: Key,
        person_name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "historic_people")]
    struct PersonMention {
        //        mention_count: i32,
        person_id: Key,
        person_name: String,
    }

    // PersonDerived contains additional information from tables other than historic_people
    // a interop::Person can be created just from a db::PersonDerived
    //
    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_people")]
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
    #[pg_mapper(table = "historic_people")]
    struct Person {
        id: Key,
        name: String,
        age: Option<String>,

        birth_date_id: Key,
        birth_location_id: Key,
        death_date_id: Option<Key>,
        death_location_id: Option<Key>,
    }

    impl From<&PersonReference> for interop::PersonReference {
        fn from(pr: &PersonReference) -> interop::PersonReference {
            interop::PersonReference {
                note_id: pr.note_id,
                person_id: pr.person_id,
                person_name: pr.person_name.to_string(),
            }
        }
    }

    impl From<&PersonMention> for interop::PersonMention {
        fn from(pm: &PersonMention) -> interop::PersonMention {
            interop::PersonMention {
                //                mention_count: pm.mention_count,
                person_id: pm.person_id,
                person_name: pm.person_name.to_string(),
            }
        }
    }

    impl From<PersonDerived> for interop::Person {
        fn from(e: PersonDerived) -> interop::Person {
            interop::Person {
                id: e.id,
                name: e.name,
                birth_date: handle_dates::interop::try_build(
                    e.birth_date_id,
                    e.bd_textual,
                    e.bd_exact_date,
                    e.bd_lower_date,
                    e.bd_upper_date,
                    e.bd_fuzz,
                ),
                birth_location: handle_locations::interop::try_build(
                    e.birth_location_id,
                    e.bl_textual,
                    e.bl_longitude,
                    e.bl_latitude,
                    e.bl_fuzz,
                ),
                death_date: handle_dates::interop::try_build(
                    e.death_date_id,
                    e.dd_textual,
                    e.dd_exact_date,
                    e.dd_lower_date,
                    e.dd_upper_date,
                    e.dd_fuzz,
                ),
                death_location: handle_locations::interop::try_build(
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

    pub async fn create_person(
        db_pool: &Pool,
        person: &interop::CreatePerson,
        user_id: Key,
    ) -> Result<interop::Person> {
        // todo: all of these database operations should be in a transaction

        let birth_date = handle_dates::db::create_date(&db_pool, &person.birth_date).await?;
        let birth_date_id = birth_date.id;

        let birth_location =
            handle_locations::db::create_location(&db_pool, &person.birth_location).await?;
        let birth_location_id = birth_location.id;

        let death_date: Option<handle_dates::interop::Date>;
        let death_date_id: Option<Key>;
        if let Some(date) = &person.death_date {
            let res = handle_dates::db::create_date(&db_pool, &date).await?;
            death_date_id = Some(res.id);
            death_date = Some(res);
        } else {
            death_date = None;
            death_date_id = None;
        };

        let death_location: Option<handle_locations::interop::Location>;
        let death_location_id: Option<Key>;
        if let Some(location) = &person.death_location {
            let res = handle_locations::db::create_location(&db_pool, &location).await?;
            death_location_id = Some(res.id);
            death_location = Some(res);
        } else {
            death_location = None;
            death_location_id = None;
        };

        let age: Option<String> = None; // todo: calculate age

        let db_person = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_create.sql"),
            &[
                &user_id,
                &person.name,
                &age,
                &birth_date_id,
                &birth_location_id,
                &death_date_id,
                &death_location_id,
            ],
        )
        .await?;

        Ok(interop::Person {
            id: db_person.id,
            name: db_person.name,
            birth_date: Some(handle_dates::interop::Date::from(birth_date)), // todo: remove options from birth information
            birth_location: Some(handle_locations::interop::Location::from(birth_location)),
            death_date: death_date.map(|d| handle_dates::interop::Date::from(d)),
            death_location: death_location.map(|l| handle_locations::interop::Location::from(l)),

            notes: None,
            quotes: None,

            people_referenced: None,
            subjects_referenced: None,

            mentioned_by_people: None,
            mentioned_in_subjects: None,
            mentioned_in_articles: None,
        })
    }

    pub async fn get_people(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Person>> {
        let db_people = pg::many::<PersonDerived>(
            db_pool,
            include_str!("sql/historic_people_all_derived.sql"),
            &[&user_id],
        )
        .await?;

        let people: Vec<interop::Person> = db_people
            .into_iter()
            .map(|db_person| interop::Person::from(db_person))
            .collect();

        Ok(people)
    }

    pub async fn get_person(
        db_pool: &Pool,
        person_id: Key,
        user_id: Key,
    ) -> Result<interop::Person> {
        let db_person = pg::one::<PersonDerived>(
            db_pool,
            include_str!("sql/historic_people_get_derived.sql"),
            &[&person_id, &user_id],
        )
        .await?;

        let person = interop::Person::from(db_person);

        Ok(person)
    }

    // ???
    pub async fn edit_person(
        db_pool: &Pool,
        person: &interop::Person,
        person_id: Key,
        user_id: Key,
    ) -> Result<interop::Person> {
        let db_person = pg::one::<PersonDerived>(
            db_pool,
            include_str!("sql/historic_people_edit.sql"),
            &[&person.name, &person_id, &user_id],
        )
        .await?;

        let person = interop::Person::from(db_person);

        Ok(person)
    }

    // todo: don't need to get a PersonDerived for delete, Person is enough
    pub async fn delete_person(db_pool: &Pool, person_id: Key, user_id: Key) -> Result<()> {
        let person = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_get.sql"),
            &[&person_id, &user_id],
        )
        .await?;

        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&db_pool, Model::HistoricPerson, person_id).await?;
        handle_edges::db::delete_all_edges_for(&db_pool, Model::HistoricPerson, person_id).await?;

        handle_dates::db::delete_date(db_pool, person.birth_date_id).await?;
        handle_locations::db::delete_location(db_pool, person.birth_location_id).await?;

        if let Some(id) = person.death_date_id {
            handle_dates::db::delete_date(db_pool, id).await?;
        }
        if let Some(id) = person.death_location_id {
            handle_locations::db::delete_location(db_pool, id).await?;
        }

        pg::delete_owned_by_user::<Person>(db_pool, person_id, user_id, Model::HistoricPerson)
            .await?;

        Ok(())
    }

    pub async fn get_people_referenced(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<interop::PersonReference>> {
        let e1 = edge_type::model_to_note(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/historic_people_referenced.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let db_people_referenced = pg::many::<PersonReference>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::NoteToHistoricPerson],
        )
        .await?;

        let people_referenced = db_people_referenced
            .iter()
            .map(|p| interop::PersonReference::from(p))
            .collect();

        Ok(people_referenced)
    }

    pub async fn people_that_mention(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<interop::PersonMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/historic_people_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let db_mentioned_by_people =
            pg::many::<PersonMention>(db_pool, &stmt, &[&id, &e1, &EdgeType::HistoricPersonToNote])
                .await?;

        let mentioned_by_people = db_mentioned_by_people
            .iter()
            .map(|m| interop::PersonMention::from(m))
            .collect();

        Ok(mentioned_by_people)
    }
}
