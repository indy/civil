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
use crate::interop::{IdParam, Key};
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

mod interop {
    use crate::handle_dates::interop::{CreateDate, Date};
    use crate::handle_historic_people::interop::PersonReference;
    use crate::handle_locations::interop::{CreateLocation, Location};
    use crate::handle_notes::interop::Note;
    use crate::handle_subjects::interop::SubjectReference;
    use crate::interop::Key;

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

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreatePoint {
        pub title: String,
        pub date: Option<CreateDate>,
        pub location: Option<CreateLocation>,
    }
}

pub async fn create_point(
    _point: Json<interop::CreatePoint>,
    _db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    unimplemented!()
}

pub async fn get_points(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_points");
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;
    // db statement
    let points = db::get_points(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(points))
}

pub async fn get_point(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_point {:?}", params.id);
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // db statements
    let point_id = params.id;
    let mut point = db::get_point(&db_pool, point_id, user_id).await?;

    let notes =
        handle_notes::db::all_notes_for(&db_pool, Model::HistoricPoint, point_id, NoteType::Note)
            .await?;
    // let notes = db_notes
    //     .iter()
    //     .map(|n| handle_notes::interop::Note::from(n))
    //     .collect();
    point.notes = Some(notes);

    let people_referenced =
        handle_historic_people::db::get_people_referenced(&db_pool, Model::HistoricPoint, point_id)
            .await?;
    point.people_referenced = Some(people_referenced);

    let subjects_referenced =
        handle_subjects::db::get_subjects_referenced(&db_pool, Model::HistoricPoint, point_id)
            .await?;
    point.subjects_referenced = Some(subjects_referenced);

    Ok(HttpResponse::Ok().json(point))
}

pub async fn edit_point(
    _point: Json<interop::Point>,
    _db_pool: Data<Pool>,
    _params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    unimplemented!();
}

pub async fn delete_point(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_point(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

mod db {
    use super::interop;
    use crate::error::Result;
    use crate::handle_dates;
    use crate::handle_edges;
    use crate::handle_locations;
    use crate::handle_notes;
    use crate::interop::Key;
    use crate::model::Model;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_points")]
    struct Point {
        id: Key,
        title: String,

        date_id: Option<Key>,
        date_textual: Option<String>,
        date_exact_date: Option<chrono::NaiveDate>,
        date_lower_date: Option<chrono::NaiveDate>,
        date_upper_date: Option<chrono::NaiveDate>,
        date_fuzz: Option<f32>,

        location_id: Option<Key>,
        location_textual: Option<String>,
        location_longitude: Option<f32>,
        location_latitude: Option<f32>,
        location_fuzz: Option<f32>,
    }

    impl From<Point> for interop::Point {
        fn from(e: Point) -> interop::Point {
            interop::Point {
                id: e.id,
                title: e.title,

                // todo:
                // why does this code fail when we use an sql query that only returns date_id?
                // the other values should be None and the try_build functions should work
                //
                date: handle_dates::interop::try_build(
                    e.date_id,
                    e.date_textual,
                    e.date_exact_date,
                    e.date_lower_date,
                    e.date_upper_date,
                    e.date_fuzz,
                ),
                location: handle_locations::interop::try_build(
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

    pub async fn get_points(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Point>> {
        let db_points = pg::many::<Point>(
            db_pool,
            include_str!("sql/historic_points_all.sql"),
            &[&user_id],
        )
        .await?;

        let points: Vec<interop::Point> = db_points
            .into_iter()
            .map(|db_point| interop::Point::from(db_point))
            .collect();

        Ok(points)
    }

    pub async fn get_point(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<interop::Point> {
        let db_point = get_db_point(db_pool, point_id, user_id).await?;
        let point = interop::Point::from(db_point);

        Ok(point)
    }

    pub async fn delete_point(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<()> {
        let point = get_db_point(db_pool, point_id, user_id).await?;

        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&db_pool, Model::HistoricPoint, point_id).await?;
        handle_edges::db::delete_all_edges_for(&db_pool, Model::HistoricPoint, point_id).await?;

        if let Some(id) = point.date_id {
            handle_dates::db::delete_date(db_pool, id).await?;
        }
        if let Some(id) = point.location_id {
            handle_locations::db::delete_location(db_pool, id).await?;
        }

        pg::delete_owned_by_user::<Point>(db_pool, point_id, user_id, Model::HistoricPoint).await?;

        Ok(())
    }

    async fn get_db_point(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<Point> {
        let db_point = pg::one::<Point>(
            db_pool,
            include_str!("sql/historic_points_get.sql"),
            &[&point_id, &user_id],
        )
        .await?;

        Ok(db_point)
    }
}
