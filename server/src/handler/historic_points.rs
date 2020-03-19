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

mod interop {
    use crate::handler::dates::interop::{CreateDate, Date};
    use crate::handler::decks::interop::DeckReference;
    use crate::handler::locations::interop::{CreateLocation, Location};
    use crate::handler::notes::interop::Note;
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Point {
        pub id: Key,
        pub title: String,
        pub date: Option<Date>,
        pub location: Option<Location>,

        pub notes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<DeckReference>>,
        pub subjects_referenced: Option<Vec<DeckReference>>,
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
    let point = db::create(&db_pool, &point, user_id).await?;

    Ok(HttpResponse::Ok().json(point))
}

pub async fn get_points(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_points");
    let user_id = session::user_id(&session)?;
    // db statement
    let points = db::all(&db_pool, user_id).await?;

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
    let mut point = db::get(&db_pool, point_id, user_id).await?;

    let notes = notes::db::all_notes_for(&db_pool, point_id, NoteType::Note).await?;
    point.notes = Some(notes);

    let people_referenced = decks::db::referenced_in(
        &db_pool,
        Model::HistoricPoint,
        point_id,
        Model::HistoricPerson,
    )
    .await?;
    point.people_referenced = Some(people_referenced);

    let subjects_referenced =
        decks::db::referenced_in(&db_pool, Model::HistoricPoint, point_id, Model::Subject).await?;
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

    let point = db::edit(&db_pool, &point, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(point))
}

pub async fn delete_point(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

mod db {
    use super::interop;
    use crate::error::{Error, Result};
    use crate::handler::dates;
    use crate::handler::edges;
    use crate::handler::locations;
    use crate::handler::notes;
    use crate::interop::Key;
    use crate::model::Model;
    use crate::pg;
    use deadpool_postgres::{Client, Pool};
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "decks")]
    struct PointDerived {
        id: Key,
        name: String,

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
    #[pg_mapper(table = "decks")]
    struct Point {
        id: Key,
        name: String,
        date_id: Option<Key>,
        location_id: Option<Key>,
    }

    impl From<PointDerived> for interop::Point {
        fn from(e: PointDerived) -> interop::Point {
            interop::Point {
                id: e.id,
                title: e.name,

                // todo:
                // why does this code fail when we use an sql query that only returns date_id?
                // the other values should be None and the try_build functions should work
                //
                date: dates::interop::try_build(
                    e.date_id,
                    e.date_textual,
                    e.date_exact_date,
                    e.date_lower_date,
                    e.date_upper_date,
                    e.date_fuzz,
                ),
                location: locations::interop::try_build(
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

    pub async fn create(
        db_pool: &Pool,
        point: &interop::CreatePoint,
        user_id: Key,
    ) -> Result<interop::Point> {
        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        let point_date: Option<dates::interop::Date>;
        let point_date_id: Option<Key>;
        if let Some(date) = &point.date {
            let res = dates::db::create(&tx, &date).await?;
            point_date_id = Some(res.id);
            point_date = Some(res);
        } else {
            point_date = None;
            point_date_id = None;
        };

        let point_location: Option<locations::interop::Location>;
        let point_location_id: Option<Key>;
        if let Some(location) = &point.location {
            let res = locations::db::create(&tx, &location).await?;
            point_location_id = Some(res.id);
            point_location = Some(res);
        } else {
            point_location = None;
            point_location_id = None;
        };

        let db_point = pg::one::<Point>(
            &tx,
            include_str!("../sql/historic_points_create.sql"),
            &[&user_id, &point.title, &point_date_id, &point_location_id],
        )
        .await?;

        tx.commit().await?;

        Ok(interop::Point {
            id: db_point.id,
            title: db_point.name,

            date: point_date,
            location: point_location,

            notes: None,

            people_referenced: None,
            subjects_referenced: None,
        })
    }

    pub async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Point>> {
        pg::many_from::<PointDerived, interop::Point>(
            db_pool,
            include_str!("../sql/historic_points_all.sql"),
            &[&user_id],
        )
        .await
    }

    pub async fn get(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<interop::Point> {
        pg::one_from::<PointDerived, interop::Point>(
            db_pool,
            include_str!("../sql/historic_points_get_derived.sql"),
            &[&user_id, &point_id],
        )
        .await
    }

    pub async fn edit(
        db_pool: &Pool,
        updated_point: &interop::Point,
        point_id: Key,
        user_id: Key,
    ) -> Result<interop::Point> {
        let existing_point = get(db_pool, point_id, user_id).await?;

        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        if let Some(existing_date) = &existing_point.date {
            if let Some(updated_date) = &updated_point.date {
                if updated_date != existing_date {
                    dates::db::edit(&tx, &updated_date, existing_date.id).await?;
                }
            }
        }

        if let Some(existing_loc) = &existing_point.location {
            if let Some(updated_loc) = &updated_point.location {
                if updated_loc != existing_loc {
                    locations::db::edit(&tx, &updated_loc, existing_loc.id).await?;
                }
            }
        }

        let _db_point = pg::one::<Point>(
            &tx,
            include_str!("../sql/historic_points_edit.sql"),
            &[&user_id, &point_id, &updated_point.title],
        )
        .await?;

        tx.commit().await?;

        let altered_point = get(db_pool, point_id, user_id).await?;

        Ok(altered_point)
    }

    pub async fn delete(db_pool: &Pool, point_id: Key, user_id: Key) -> Result<()> {
        let point = pg::one_non_transactional::<PointDerived>(
            db_pool,
            include_str!("../sql/historic_points_get_derived.sql"),
            &[&user_id, &point_id],
        )
        .await?;

        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        // deleting notes require valid edge information, so delete notes before edges
        //
        notes::db::delete_all_notes_for(&tx, Model::HistoricPoint, point_id).await?;
        edges::db::delete_all_edges_for_deck(&tx, Model::HistoricPoint, point_id).await?;

        if let Some(id) = point.date_id {
            dates::db::delete(&tx, id).await?;
        }
        if let Some(id) = point.location_id {
            locations::db::delete(&tx, id).await?;
        }

        pg::delete_owned_by_user::<Point>(&tx, point_id, user_id, Model::HistoricPoint).await?;

        tx.commit().await?;

        Ok(())
    }
}
