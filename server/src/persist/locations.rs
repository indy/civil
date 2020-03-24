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

use super::pg;
use crate::error::Result;
use crate::interop::locations as interop;
use crate::interop::{Key, Model};
use deadpool_postgres::Transaction;
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

pub(crate) async fn create(
    tx: &Transaction<'_>,
    location: &interop::CreateLocation,
) -> Result<interop::Location> {
    let db_location = pg::one::<Location>(
        tx,
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

pub(crate) async fn edit(
    tx: &Transaction<'_>,
    location: &interop::Location,
    location_id: Key,
) -> Result<interop::Location> {
    let db_location = pg::one::<Location>(
        tx,
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

pub(crate) async fn delete(tx: &Transaction<'_>, location_id: Key) -> Result<()> {
    let stmt = pg::delete_statement(Model::Location)?;

    pg::zero::<Location>(tx, &stmt, &[&location_id]).await?;
    Ok(())
}
