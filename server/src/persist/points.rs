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
use crate::interop::points as interop;
use crate::interop::Key;
use deadpool_postgres::{Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "points")]
struct Point {
    id: Key,

    title: Option<String>,

    location_textual: Option<String>,
    longitude: Option<f32>,
    latitude: Option<f32>,
    location_fuzz: f32,

    date_textual: Option<String>,
    exact_date: Option<chrono::NaiveDate>,
    lower_date: Option<chrono::NaiveDate>,
    upper_date: Option<chrono::NaiveDate>,
    date_fuzz: f32,
}

impl From<Point> for interop::Point {
    fn from(e: Point) -> interop::Point {
        interop::Point {
            id: e.id,
            title: e.title,

            location_textual: e.location_textual,
            longitude: e.longitude,
            latitude: e.latitude,
            location_fuzz: e.location_fuzz,

            date_textual: e.date_textual,
            exact_date: e.exact_date,
            lower_date: e.lower_date,
            upper_date: e.upper_date,
            date_fuzz: e.date_fuzz,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key, deck_id: Key) -> Result<Vec<interop::Point>> {
    pg::many_from::<Point, interop::Point>(
        db_pool,
        include_str!("sql/points_all.sql"),
        &[&user_id, &deck_id],
    )
    .await
}

pub(crate) async fn create(
    tx: &Transaction<'_>,
    point: &interop::ProtoPoint,
) -> Result<interop::Point> {
    let db_point = pg::one::<Point>(
        tx,
        include_str!("sql/points_create.sql"),
        &[
            &point.title,
            &point.location_textual,
            &point.longitude,
            &point.latitude,
            &point.location_fuzz,
            &point.date_textual,
            &point.exact_date,
            &point.lower_date,
            &point.upper_date,
            &point.date_fuzz,
        ],
    )
    .await?;

    let point = interop::Point::from(db_point);
    Ok(point)
}

/*
pub(crate) async fn edit(
    tx: &Transaction<'_>,
    point: &interop::ProtoPoint,
    point_id: Key,
) -> Result<interop::Point> {
    let db_point = pg::one::<Point>(
        tx,
        include_str!("sql/points_edit.sql"),
        &[
            &point_id,
            &point.title,
            &point.location_textual,
            &point.longitude,
            &point.latitude,
            &point.location_fuzz,
            &point.date_textual,
            &point.exact_date,
            &point.lower_date,
            &point.upper_date,
            &point.date_fuzz,
        ],
    )
    .await?;

    let point = interop::Point::from(db_point);
    Ok(point)
}
*/

pub(crate) async fn delete_all_points_connected_with_deck(
    tx: &Transaction<'_>,
    deck_id: Key,
) -> Result<()> {
    pg::zero(
        tx,
        &include_str!("sql/points_delete_all_connected_with_deck.sql"),
        &[&deck_id],
    )
    .await?;
    pg::zero(
        tx,
        &include_str!("sql/points_delete_all_decks_points_connected_with_deck.sql"),
        &[&deck_id],
    )
    .await?;

    Ok(())
}

/*
pub(crate) async fn delete(tx: &Transaction<'_>, point_id: Key) -> Result<()> {
    let stmt = pg::delete_statement(Model::Point)?;

    pg::zero(tx, &stmt, &[&point_id]).await?;
    Ok(())
}
 */
