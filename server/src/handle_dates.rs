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
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

pub mod interop {
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Date {
        pub id: Key,
        pub textual: Option<String>,
        pub exact_date: Option<chrono::NaiveDate>,
        pub lower_date: Option<chrono::NaiveDate>,
        pub upper_date: Option<chrono::NaiveDate>,
        pub fuzz: f32,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateDate {
        pub textual: Option<String>,
        pub exact_date: Option<chrono::NaiveDate>,
        pub lower_date: Option<chrono::NaiveDate>,
        pub upper_date: Option<chrono::NaiveDate>,
        pub fuzz: f32,
    }

    pub fn try_build(
        id: Option<Key>,
        textual: Option<String>,
        exact_date: Option<chrono::NaiveDate>,
        lower_date: Option<chrono::NaiveDate>,
        upper_date: Option<chrono::NaiveDate>,
        fuzz: Option<f32>,
    ) -> Option<Date> {
        if let Some(id) = id {
            Some(Date {
                id: id,
                textual,
                exact_date,
                lower_date,
                upper_date,
                fuzz: fuzz.unwrap_or(1.0),
            })
        } else {
            None
        }
    }
}

pub async fn create_date(
    date: Json<interop::CreateDate>,
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let date = date.into_inner();

    let date = db::create_date(&db_pool, &date).await?;

    Ok(HttpResponse::Ok().json(date))
}

pub async fn get_date(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let date = db::get_date(&db_pool, params.id).await?;

    Ok(HttpResponse::Ok().json(date))
}

pub async fn edit_date(
    date: Json<interop::Date>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let date = date.into_inner();

    let date = db::edit_date(&db_pool, &date, params.id).await?;

    Ok(HttpResponse::Ok().json(date))
}

pub async fn delete_date(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    db::delete_date(&db_pool, params.id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::error::Result;
    use crate::interop::Key;
    use crate::model::Model;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "dates")]
    struct Date {
        id: Key,

        // this doens't work - timezone conversion issue???
        // created_at: chrono::NaiveDateTime,
        textual: Option<String>,
        exact_date: Option<chrono::NaiveDate>,
        lower_date: Option<chrono::NaiveDate>,
        upper_date: Option<chrono::NaiveDate>,
        fuzz: f32,
    }

    impl From<Date> for interop::Date {
        fn from(e: Date) -> interop::Date {
            interop::Date {
                id: e.id,
                textual: e.textual,
                exact_date: e.exact_date,
                lower_date: e.lower_date,
                upper_date: e.upper_date,
                fuzz: e.fuzz,
            }
        }
    }

    pub async fn create_date(db_pool: &Pool, date: &interop::CreateDate) -> Result<interop::Date> {
        let db_date = pg::one::<Date>(
            db_pool,
            include_str!("sql/dates_create.sql"),
            &[
                &date.textual,
                &date.exact_date,
                &date.lower_date,
                &date.upper_date,
                &date.fuzz,
            ],
        )
        .await?;

        let date = interop::Date::from(db_date);

        Ok(date)
    }

    pub async fn get_date(db_pool: &Pool, date_id: Key) -> Result<interop::Date> {
        let db_date =
            pg::one::<Date>(db_pool, include_str!("sql/dates_get.sql"), &[&date_id]).await?;

        let date = interop::Date::from(db_date);

        Ok(date)
    }

    pub async fn edit_date(
        db_pool: &Pool,
        date: &interop::Date,
        date_id: Key,
    ) -> Result<interop::Date> {
        let db_date = pg::one::<Date>(
            db_pool,
            include_str!("sql/dates_edit.sql"),
            &[
                &date_id,
                &date.textual,
                &date.exact_date,
                &date.lower_date,
                &date.upper_date,
                &date.fuzz,
            ],
        )
        .await?;

        let date = interop::Date::from(db_date);

        Ok(date)
    }

    pub async fn delete_date(db_pool: &Pool, date_id: Key) -> Result<()> {
        pg::delete::<Date>(db_pool, date_id, Model::Date).await?;
        Ok(())
    }
}
