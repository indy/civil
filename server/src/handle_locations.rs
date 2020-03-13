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
    pub struct Location {
        pub id: Key,
        pub textual: Option<String>,
        pub longitude: Option<f32>,
        pub latitude: Option<f32>,
        pub fuzz: f32,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateLocation {
        pub textual: Option<String>,
        pub longitude: Option<f32>,
        pub latitude: Option<f32>,
        pub fuzz: f32,
    }

    pub fn try_build(
        id: Option<Key>,
        textual: Option<String>,
        longitude: Option<f32>,
        latitude: Option<f32>,
        fuzz: Option<f32>,
    ) -> Option<Location> {
        if let Some(id) = id {
            Some(Location {
                id: id,
                textual,
                longitude,
                latitude,
                fuzz: fuzz.unwrap_or(0.0),
            })
        } else {
            None
        }
    }
}

pub async fn create_location(
    location: Json<interop::CreateLocation>,
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let location = location.into_inner();

    let location = db::create_location(&db_pool, &location).await?;

    Ok(HttpResponse::Ok().json(location))
}

pub async fn get_location(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let location = db::get_location(&db_pool, params.id).await?;

    Ok(HttpResponse::Ok().json(location))
}

pub async fn edit_location(
    location: Json<interop::Location>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let location = location.into_inner();

    let location = db::edit_location(&db_pool, &location, params.id).await?;

    Ok(HttpResponse::Ok().json(location))
}

pub async fn delete_location(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    db::delete_location(&db_pool, params.id).await?;

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

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "locations")]
    struct Location {
        id: Key,

        textual: Option<String>,
        longitude: Option<f32>,
        latitude: Option<f32>,
        fuzz: f32,
    }

    impl From<Location> for interop::Location {
        fn from(e: Location) -> interop::Location {
            interop::Location {
                id: e.id,
                textual: e.textual,
                longitude: e.longitude,
                latitude: e.latitude,
                fuzz: e.fuzz,
            }
        }
    }

    pub async fn create_location(
        db_pool: &Pool,
        location: &interop::CreateLocation,
    ) -> Result<interop::Location> {
        let db_location = pg::one::<Location>(
            db_pool,
            include_str!("sql/locations_create.sql"),
            &[
                &location.textual,
                &location.longitude,
                &location.latitude,
                &location.fuzz,
            ],
        )
        .await?;

        let location = interop::Location::from(db_location);
        Ok(location)
    }

    pub async fn get_location(db_pool: &Pool, location_id: Key) -> Result<interop::Location> {
        let db_location = pg::one::<Location>(
            db_pool,
            include_str!("sql/locations_get.sql"),
            &[&location_id],
        )
        .await?;

        let location = interop::Location::from(db_location);
        Ok(location)
    }

    pub async fn edit_location(
        db_pool: &Pool,
        location: &interop::Location,
        location_id: Key,
    ) -> Result<interop::Location> {
        let db_location = pg::one::<Location>(
            db_pool,
            include_str!("sql/locations_edit.sql"),
            &[
                &location_id,
                &location.textual,
                &location.longitude,
                &location.latitude,
                &location.fuzz,
            ],
        )
        .await?;

        let location = interop::Location::from(db_location);
        Ok(location)
    }

    pub async fn delete_location(db_pool: &Pool, location_id: Key) -> Result<()> {
        pg::delete::<Location>(db_pool, location_id, Model::Location).await?;
        Ok(())
    }
}
