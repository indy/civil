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
use crate::handle_historic_people;
use crate::handle_notes;
use crate::handle_subjects;
use crate::interop::IdParam;
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
    point: Json<interop::CreatePoint>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_point");
    let point = point.into_inner();
    let user_id = session::user_id(&session)?;

    // db statement
    let point = db::create_point(&db_pool, &point, user_id).await?;

    Ok(HttpResponse::Ok().json(point))
}

pub async fn get_points(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_points");
    let user_id = session::user_id(&session)?;
    // db statement
    let points = db::get_points(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(points))
}

pub async fn get_point(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_point {:?}", params.id);
    let user_id = session::user_id(&session)?;

    // db statements
    let point_id = params.id;
    let mut point = db::get_point(&db_pool, point_id, user_id).await?;

    let notes =
        handle_notes::db::all_notes_for(&db_pool, Model::HistoricPoint, point_id, NoteType::Note)
            .await?;
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
    point: Json<interop::Point>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit_point");

    let point = point.into_inner();
    let user_id = session::user_id(&session)?;

    let point = db::edit_point(&db_pool, &point, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(point))
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
    use crate::error::{Error, Result};
    use crate::handle_dates;
    use crate::handle_edges;
    use crate::handle_locations;
    use crate::handle_notes;
    use crate::interop::Key;
    use crate::model::Model;
    use crate::pg;
    use deadpool_postgres::{Client, Pool};
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_points")]
    struct PointDerived {
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

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "historic_points")]
    struct Point {
        id: Key,
        title: String,
        date_id: Option<Key>,
        location_id: Option<Key>,
    }

    impl From<PointDerived> for interop::Point {
        fn from(e: PointDerived) -> interop::Point {
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

    pub async fn create_point(
        db_pool: &Pool,
        point: &interop::CreatePoint,
        user_id: Key,
    ) -> Result<interop::Point> {
        let mut client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;
        let tx = client.transaction().await?;

        let point_date: Option<handle_dates::interop::Date>;
        let point_date_id: Option<Key>;
        if let Some(date) = &point.date {
            let res = handle_dates::db::create_date(&tx, &date).await?;
            point_date_id = Some(res.id);
            point_date = Some(res);
        } else {
            point_date = None;
            point_date_id = None;
        };

        let point_location: Option<handle_locations::interop::Location>;
        let point_location_id: Option<Key>;
        if let Some(location) = &point.location {
            let res = handle_locations::db::create_location(&tx, &location).await?;
            point_location_id = Some(res.id);
            point_location = Some(res);
        } else {
            point_location = None;
            point_location_id = None;
        };

        let db_point = pg::one::<Point>(
            &tx,
            include_str!("sql/historic_points_create.sql"),
            &[&user_id, &point.title, &point_date_id, &point_location_id],
        )
        .await?;

        tx.commit().await?;

        Ok(interop::Point {
            id: db_point.id,
            title: db_point.title,

            date: point_date.map(|d| handle_dates::interop::Date::from(d)),
            location: point_location.map(|l| handle_locations::interop::Location::from(l)),

            notes: None,

            people_referenced: None,
            subjects_referenced: None,
        })
    }

    pub async fn get_points(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Point>> {
        let db_points = pg::many_non_transactional::<PointDerived>(
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

    pub async fn edit_point(
        db_pool: &Pool,
        updated_point: &interop::Point,
        point_id: Key,
        user_id: Key,
    ) -> Result<interop::Point> {
        let existing_point = get_point(db_pool, point_id, user_id).await?;

        let mut client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;
        let tx = client.transaction().await?;

        if let Some(existing_date) = &existing_point.date {
            if let Some(updated_date) = &updated_point.date {
                if updated_date != existing_date {
                    handle_dates::db::edit_date(&tx, &updated_date, existing_date.id).await?;
                }
            }
        }

        if let Some(existing_loc) = &existing_point.location {
            if let Some(updated_loc) = &updated_point.location {
                if updated_loc != existing_loc {
                    handle_locations::db::edit_location(&tx, &updated_loc, existing_loc.id).await?;
                }
            }
        }

        let _db_point = pg::one::<Point>(
            &tx,
            include_str!("sql/historic_points_edit.sql"),
            &[&user_id, &point_id, &updated_point.title],
        )
        .await?;

        tx.commit().await?;

        let altered_point = get_point(db_pool, point_id, user_id).await?;

        Ok(altered_point)
    }

    pub async fn delete_point(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<()> {
        let point = get_db_point(db_pool, point_id, user_id).await?;

        let mut client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;
        let tx = client.transaction().await?;

        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&tx, Model::HistoricPoint, point_id).await?;
        handle_edges::db::delete_all_edges_for(&tx, Model::HistoricPoint, point_id).await?;

        if let Some(id) = point.date_id {
            handle_dates::db::delete_date(&tx, id).await?;
        }
        if let Some(id) = point.location_id {
            handle_locations::db::delete_location(&tx, id).await?;
        }

        pg::delete_owned_by_user::<Point>(&tx, point_id, user_id, Model::HistoricPoint).await?;

        tx.commit().await?;

        Ok(())
    }

    async fn get_db_point(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<PointDerived> {
        let db_point = pg::one_non_transactional::<PointDerived>(
            db_pool,
            include_str!("sql/historic_points_get_derived.sql"),
            &[&point_id, &user_id],
        )
        .await?;

        Ok(db_point)
    }
}
