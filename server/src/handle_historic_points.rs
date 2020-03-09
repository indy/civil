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
use crate::handle_historic_people;
use crate::handle_notes;
use crate::handle_subjects;
use crate::model::Model;
use crate::note_type::NoteType;
//use crate::session;
use crate::types::Key;
use crate::web_common;
use actix_web::web::{Data, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

mod web {
    use crate::handle_dates::web::Date;
    use crate::handle_historic_people::web::PersonReference;
    use crate::handle_locations::web::Location;
    use crate::handle_notes::web::Note;
    use crate::handle_subjects::web::SubjectReference;
    use crate::types::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Point {
        pub id: Key,
        pub title: String,
        pub date: Option<Date>,
        pub location: Option<Location>,

        pub notes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<PersonReference>>,
        pub subjects_referenced: Option<Vec<SubjectReference>>,
    }
}

pub async fn get_points(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_points");
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;
    // db statement
    let db_points: Vec<db::Point> = db::get_points(&db_pool, user_id).await?;

    let points: Vec<web::Point> = db_points
        .into_iter()
        .map(|db_point| web::Point::from(db_point))
        .collect();

    Ok(HttpResponse::Ok().json(points))
}

pub async fn get_point(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_point {:?}", params.id);
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // db statements
    let point_id = params.id;
    let db_point: db::Point = db::get_point(&db_pool, point_id, user_id).await?;
    let mut point = web::Point::from(db_point);

    let db_notes =
        handle_notes::db::all_notes_for(&db_pool, Model::HistoricPoint, point_id, NoteType::Note)
            .await?;
    let notes = db_notes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    point.notes = Some(notes);

    let db_people_referenced =
        handle_historic_people::db::get_people_referenced(&db_pool, Model::HistoricPoint, point_id)
            .await?;
    let people_referenced = db_people_referenced
        .iter()
        .map(|p| handle_historic_people::web::PersonReference::from(p))
        .collect();
    point.people_referenced = Some(people_referenced);

    let db_subjects_referenced =
        handle_subjects::db::get_subjects_referenced(&db_pool, Model::HistoricPoint, point_id)
            .await?;
    let subjects_referenced = db_subjects_referenced
        .iter()
        .map(|p| handle_subjects::web::SubjectReference::from(p))
        .collect();
    point.subjects_referenced = Some(subjects_referenced);

    Ok(HttpResponse::Ok().json(point))
}

mod db {
    use super::web;
    use crate::error::Result;
    use crate::handle_dates;
    use crate::handle_locations;
    use crate::pg;
    use crate::types::Key;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_points")]
    pub struct Point {
        pub id: Key,
        pub title: String,

        pub date_id: Option<Key>,
        pub date_textual: Option<String>,
        pub date_exact_date: Option<chrono::NaiveDate>,
        pub date_lower_date: Option<chrono::NaiveDate>,
        pub date_upper_date: Option<chrono::NaiveDate>,
        pub date_fuzz: Option<f32>,

        pub location_id: Option<Key>,
        pub location_textual: Option<String>,
        pub location_longitude: Option<f32>,
        pub location_latitude: Option<f32>,
        pub location_fuzz: Option<f32>,
    }

    impl From<Point> for web::Point {
        fn from(e: Point) -> web::Point {
            web::Point {
                id: e.id,
                title: e.title,

                // todo:
                // why does this code fail when we use an sql query that only returns date_id?
                // the other values should be None and the try_build functions should work
                //
                date: handle_dates::web::try_build(
                    e.date_id,
                    e.date_textual,
                    e.date_exact_date,
                    e.date_lower_date,
                    e.date_upper_date,
                    e.date_fuzz,
                ),
                location: handle_locations::web::try_build(
                    e.location_id,
                    e.location_textual,
                    e.location_longitude,
                    e.location_latitude,
                    e.location_fuzz,
                ),
                notes: None,

                people_referenced: None,
                subjects_referenced: None,
            }
        }
    }

    pub async fn get_points(db_pool: &Pool, user_id: Key) -> Result<Vec<Point>> {
        let res = pg::many::<Point>(
            db_pool,
            include_str!("sql/historic_points_all.sql"),
            &[&user_id],
        )
        .await?;

        Ok(res)
    }

    pub async fn get_point(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<Point> {
        let point = pg::one::<Point>(
            db_pool,
            include_str!("sql/historic_points_get.sql"),
            &[&point_id, &user_id],
        )
        .await?;

        Ok(point)
    }
}
