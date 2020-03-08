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

use crate::model::Model;
use crate::note_type::NoteType;
use crate::error::Result;
use crate::handle_notes;
use crate::handle_subjects;
use crate::session;
use crate::web_common;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use tracing::info;

mod web {
    use crate::handle_dates::web::Date;
    use crate::handle_locations::web::Location;
    use crate::handle_notes::web::Note;
    use crate::handle_subjects::web::SubjectReference;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Person {
        pub id: i64,
        pub name: String,
        pub birth_date: Option<Date>,
        pub birth_location: Option<Location>,
        pub death_date: Option<Date>,
        pub death_location: Option<Location>,

        pub notes: Option<Vec<Note>>,
        pub quotes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<PersonReference>>,
        pub subjects_referenced: Option<Vec<SubjectReference>>,

        pub mentioned_by_people: Option<Vec<PersonMention>>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct PersonReference {
        pub note_id: i64,
        pub person_id: i64,
        pub person_name: String,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct PersonMention {
        // pub mention_count: i32,
        pub person_id: i64,
        pub person_name: String,
    }

    impl From<&super::db::PersonReference> for PersonReference {
        fn from(pr: &super::db::PersonReference) -> PersonReference {
            PersonReference {
                note_id: pr.note_id,
                person_id: pr.person_id,
                person_name: pr.person_name.to_string(),
            }
        }
    }

    impl From<&super::db::PersonMention> for PersonMention {
        fn from(pm: &super::db::PersonMention) -> PersonMention {
            PersonMention {
//                mention_count: pm.mention_count,
                person_id: pm.person_id,
                person_name: pm.person_name.to_string(),
            }
        }
    }
}

pub async fn create_person(
    person: Json<web::Person>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    // db statement
    let db_person: db::Person = db::create_person(&db_pool, &person, user_id).await?;

    Ok(HttpResponse::Ok().json(web::Person::from(db_person)))
}

pub async fn get_people(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_people");
    // let user_id = session::user_id(&session)?;
    let user_id: i64 = 1;
    // db statement
    let db_people: Vec<db::Person> = db::get_people(&db_pool, user_id).await?;

    let people: Vec<web::Person> = db_people
        .into_iter()
        .map(|db_person| web::Person::from(db_person))
        .collect();

    Ok(HttpResponse::Ok().json(people))
}

pub async fn get_person(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_person {:?}", params.id);
    // let user_id = session::user_id(&session)?;
    let user_id: i64 = 1;

    // db statements
    let person_id = params.id;
    let db_person: db::Person = db::get_person(&db_pool, person_id, user_id).await?;
    let mut person = web::Person::from(db_person);

    let db_notes =
        handle_notes::db::all_notes_for(&db_pool, Model::HistoricPerson, person_id, NoteType::Note)
            .await?;
    let notes = db_notes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    person.notes = Some(notes);

    let db_quotes = handle_notes::db::all_notes_for(
        &db_pool,
        Model::HistoricPerson,
        person_id,
        NoteType::Quote,
    )
    .await?;
    let quotes = db_quotes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    person.quotes = Some(quotes);

    let db_people_referenced =
        db::get_people_referenced(&db_pool, Model::HistoricPerson, person_id).await?;
    let people_referenced = db_people_referenced
        .iter()
        .map(|p| web::PersonReference::from(p))
        .collect();
    person.people_referenced = Some(people_referenced);

    let db_subjects_referenced =
        handle_subjects::db::get_subjects_referenced(&db_pool, Model::HistoricPerson, person_id)
            .await?;
    let subjects_referenced = db_subjects_referenced
        .iter()
        .map(|p| handle_subjects::web::SubjectReference::from(p))
        .collect();
    person.subjects_referenced = Some(subjects_referenced);

    let db_mentioned_by_people = db::people_that_mention(&db_pool, Model::HistoricPerson, person_id).await?;
    let mentioned_by_people = db_mentioned_by_people.iter().map(|m| web::PersonMention::from(m)).collect();
    person.mentioned_by_people = Some(mentioned_by_people);

    Ok(HttpResponse::Ok().json(person))
}

pub async fn edit_person(
    person: Json<web::Person>,
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let person = person.into_inner();
    let user_id = session::user_id(&session)?;

    let db_person = db::edit_person(&db_pool, &person, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(web::Person::from(db_person)))
}

pub async fn delete_person(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_person(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

mod db {
    use super::web;
    use crate::edge_type::{self, EdgeType};
    use crate::model::{Model, model_to_foreign_key};
    use crate::error::Result;
    use crate::handle_dates;
    use crate::handle_locations;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "historic_people")]
    pub struct PersonReference {
        pub note_id: i64,
        pub person_id: i64,
        pub person_name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "historic_people")]
    pub struct PersonMention {
//        pub mention_count: i32,
        pub person_id: i64,
        pub person_name: String,
    }

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_people")]
    pub struct Person {
        pub id: i64,
        pub name: String,
        pub age: Option<String>,
        // birth date
        pub birth_date_id: Option<i64>,
        pub bd_textual: Option<String>,
        pub bd_exact_date: Option<chrono::NaiveDate>,
        pub bd_lower_date: Option<chrono::NaiveDate>,
        pub bd_upper_date: Option<chrono::NaiveDate>,
        pub bd_fuzz: Option<f32>,
        // birth location
        pub birth_location_id: Option<i64>,
        pub bl_textual: Option<String>,
        pub bl_longitude: Option<f32>,
        pub bl_latitude: Option<f32>,
        pub bl_fuzz: Option<f32>,
        // death date
        pub death_date_id: Option<i64>,
        pub dd_textual: Option<String>,
        pub dd_exact_date: Option<chrono::NaiveDate>,
        pub dd_lower_date: Option<chrono::NaiveDate>,
        pub dd_upper_date: Option<chrono::NaiveDate>,
        pub dd_fuzz: Option<f32>,
        // death location
        pub death_location_id: Option<i64>,
        pub dl_textual: Option<String>,
        pub dl_longitude: Option<f32>,
        pub dl_latitude: Option<f32>,
        pub dl_fuzz: Option<f32>,
    }

    impl From<Person> for web::Person {
        fn from(e: Person) -> web::Person {
            web::Person {
                id: e.id,
                name: e.name,
                birth_date: handle_dates::web::try_build(
                    e.birth_date_id,
                    e.bd_textual,
                    e.bd_exact_date,
                    e.bd_lower_date,
                    e.bd_upper_date,
                    e.bd_fuzz,
                ),
                birth_location: handle_locations::web::try_build(
                    e.birth_location_id,
                    e.bl_textual,
                    e.bl_longitude,
                    e.bl_latitude,
                    e.bl_fuzz,
                ),
                death_date: handle_dates::web::try_build(
                    e.death_date_id,
                    e.dd_textual,
                    e.dd_exact_date,
                    e.dd_lower_date,
                    e.dd_upper_date,
                    e.dd_fuzz,
                ),
                death_location: handle_locations::web::try_build(
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
            }
        }
    }

    pub async fn create_person(
        db_pool: &Pool,
        person: &web::Person,
        user_id: i64,
    ) -> Result<Person> {
        let res = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_create.sql"),
            &[&user_id, &person.name],
        ).await?;

        Ok(res)
    }

    pub async fn get_people(db_pool: &Pool, user_id: i64) -> Result<Vec<Person>> {
        let res = pg::many::<Person>(
            db_pool,
            include_str!("sql/historic_people_all.sql"),
            &[&user_id],
        ).await?;

        Ok(res)
    }

    pub async fn get_person(db_pool: &Pool, person_id: i64, user_id: i64) -> Result<Person> {
        let person = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_get.sql"),
            &[&person_id, &user_id],
        ).await?;

        Ok(person)
    }

    pub async fn edit_person(
        db_pool: &Pool,
        person: &web::Person,
        person_id: i64,
        user_id: i64,
    ) -> Result<Person> {
        let res = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_edit.sql"),
            &[&person.name, &person_id, &user_id],
        ).await?;

        Ok(res)
    }

    pub async fn delete_person(db_pool: &Pool, person_id: i64, user_id: i64) -> Result<()> {
        pg::zero::<Person>(
            db_pool,
            include_str!("sql/historic_people_delete.sql"),
            &[&person_id, &user_id],
        ).await?;

        Ok(())
    }

    pub async fn get_people_referenced(
        db_pool: &Pool,
        model: Model,
        id: i64,
    ) -> Result<Vec<PersonReference>> {
        let e1 = edge_type::model_to_note(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/historic_people_referenced.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<PersonReference>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::NoteToHistoricPerson],
        ).await?;

        Ok(res)
    }

    pub async fn people_that_mention(
        db_pool: &Pool,
        model: Model,
        id: i64,
    ) -> Result<Vec<PersonMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/historic_people_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<PersonMention>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::HistoricPersonToNote],
        ).await?;

        Ok(res)
    }
}
