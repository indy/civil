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
use crate::error::{Error, Result};
use crate::interop::dates as dates_interop;
use crate::interop::locations as locations_interop;
use crate::interop::points as interop;
use crate::interop::Key;
use crate::persist::dates;
use crate::persist::decks;
use crate::persist::locations;
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
            date: dates_interop::try_build(
                e.date_id,
                e.date_textual,
                e.date_exact_date,
                e.date_lower_date,
                e.date_upper_date,
                e.date_fuzz,
            ),
            location: locations_interop::try_build(
                e.location_id,
                e.location_textual,
                e.location_longitude,
                e.location_latitude,
                e.location_fuzz,
            ),
            notes: None,

            tags_in_notes: None,
            decks_in_notes: None,

            linkbacks_to_decks: None,
            linkbacks_to_tags: None,
        }
    }
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    point: &interop::CreatePoint,
) -> Result<interop::Point> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let point_date: Option<dates_interop::Date>;
    let point_date_id: Option<Key>;
    if let Some(date) = &point.date {
        let res = dates::create(&tx, &date).await?;
        point_date_id = Some(res.id);
        point_date = Some(res);
    } else {
        point_date = None;
        point_date_id = None;
    };

    let point_location: Option<locations_interop::Location>;
    let point_location_id: Option<Key>;
    if let Some(location) = &point.location {
        let res = locations::create(&tx, &location).await?;
        point_location_id = Some(res.id);
        point_location = Some(res);
    } else {
        point_location = None;
        point_location_id = None;
    };

    let db_point = pg::one::<Point>(
        &tx,
        include_str!("sql/points_create.sql"),
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

        tags_in_notes: None,
        decks_in_notes: None,

        linkbacks_to_decks: None,
        linkbacks_to_tags: None,
    })
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Point>> {
    pg::many_from::<PointDerived, interop::Point>(
        db_pool,
        include_str!("sql/points_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, point_id: Key) -> Result<interop::Point> {
    pg::one_from::<PointDerived, interop::Point>(
        db_pool,
        include_str!("sql/points_get.sql"),
        &[&user_id, &point_id],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    updated_point: &interop::Point,
    point_id: Key,
) -> Result<interop::Point> {
    let existing_point = get(db_pool, point_id, user_id).await?;

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    if let Some(existing_date) = &existing_point.date {
        if let Some(updated_date) = &updated_point.date {
            if updated_date != existing_date {
                dates::edit(&tx, &updated_date, existing_date.id).await?;
            }
        }
    }

    if let Some(existing_loc) = &existing_point.location {
        if let Some(updated_loc) = &updated_point.location {
            if updated_loc != existing_loc {
                locations::edit(&tx, &updated_loc, existing_loc.id).await?;
            }
        }
    }

    let _point = pg::one::<Point>(
        &tx,
        include_str!("sql/points_edit.sql"),
        &[&user_id, &point_id, &updated_point.title],
    )
    .await?;

    tx.commit().await?;

    let altered_point = get(db_pool, point_id, user_id).await?;

    Ok(altered_point)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, point_id: Key) -> Result<()> {
    decks::delete(db_pool, point_id, user_id).await
}
