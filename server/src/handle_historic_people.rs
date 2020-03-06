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

use crate::web_common;
use crate::error::Result;
use crate::session;
use actix_web::HttpResponse;
use actix_web::web::{Json, Data, Path};
use deadpool_postgres::Pool;
use tracing::info;

mod web {
    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Person {
        pub id: i64,
        pub name: String,
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

    // db statement
    let db_person: db::Person = db::get_person(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(web::Person::from(db_person)))
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
    use crate::error::Result;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_people")]
    pub struct Person {
        pub id: i64,
        pub name: String,
    }

    impl From<Person> for web::Person {
        fn from(e: Person) -> web::Person {
            web::Person {
                id: e.id,
                name: e.name,
            }
        }
    }

    pub async fn create_person(db_pool: &Pool, person: &web::Person, user_id: i64) -> Result<Person> {
        let res = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_create.sql"),
            &[&user_id, &person.name],
        )
        .await?;
        Ok(res)
    }

    pub async fn get_people(db_pool: &Pool, user_id: i64) -> Result<Vec<Person>> {
        let res =
            pg::many::<Person>(db_pool, include_str!("sql/historic_people_all.sql"), &[&user_id]).await?;
        Ok(res)
    }

    pub async fn get_person(db_pool: &Pool, person_id: i64, user_id: i64) -> Result<Person> {
        let res = pg::one::<Person>(
            db_pool,
            include_str!("sql/historic_people_get.sql"),
            &[&person_id, &user_id],
        )
        .await?;
        Ok(res)
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
        )
        .await?;
        Ok(res)
    }

    pub async fn delete_person(db_pool: &Pool, person_id: i64, user_id: i64) -> Result<()> {
        pg::zero::<Person>(
            db_pool,
            include_str!("sql/historic_people_delete.sql"),
            &[&person_id, &user_id],
        )
        .await?;
        Ok(())
    }
}
