// Copyright (C) 2021 Inderjit Gill <email@indy.io>

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
use crate::db::deck_kind::DeckKind;
use crate::db::point_kind::PointKind;
use crate::error::{Error, Result};
use crate::interop::decks as interop_decks;
use crate::interop::points as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "points")]
struct Point {
    id: Key,
    kind: PointKind,
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
            kind: interop::PointKind::from(e.kind),
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

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "points")]
struct DeckPoint {
    id: Key,
    kind: PointKind,
    title: Option<String>,
    date_textual: Option<String>,
    date: Option<chrono::NaiveDate>,

    deck_id: Key,
    deck_name: String,
    deck_kind: DeckKind,
}

impl From<DeckPoint> for interop::DeckPoint {
    fn from(e: DeckPoint) -> interop::DeckPoint {
        interop::DeckPoint {
            id: e.id,
            kind: interop::PointKind::from(e.kind),
            title: e.title,
            date_textual: e.date_textual,
            date: e.date,

            deck_id: e.deck_id,
            deck_name: e.deck_name,
            deck_resource: interop_decks::DeckResource::from(e.deck_kind),
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key, deck_id: Key) -> Result<Vec<interop::Point>> {
    pg::many_from::<Point, interop::Point>(
        db_pool,
        "select p.id,
                p.title,
                p.kind,
                p.location_textual,
                p.longitude,
                p.latitude,
                p.location_fuzz,
                p.date_textual,
                p.exact_date,
                p.lower_date,
                p.upper_date,
                p.date_fuzz
         from   decks d,
                points p
         where  d.user_id = $1
                and d.id = $2
                and p.deck_id = d.id",
        &[&user_id, &deck_id],
    )
    .await
}

pub(crate) async fn all_points_during_life(
    db_pool: &Pool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckPoint>> {
    pg::many_from::<DeckPoint, interop::DeckPoint>(
        db_pool,
        "( -- all events in the person's life (may also included relevent events that happened posthumously)
         select d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                p.id,
                p.kind,
                p.title,
                p.date_textual,
                coalesce(p.exact_date, p.lower_date) as date
         from   points p, decks d
         where  d.id = $2
                and d.user_id = $1
                and p.deck_id = d.id
         )
         union
         ( -- other events that occurred during the person's life
         select d.id as deck_id,
                d.name as deck_name,
                d.kind as deck_kind,
                p.id,
                p.kind,
                p.title,
                p.date_textual,
                coalesce(p.exact_date, p.lower_date) as date
         from   points p, decks d
         where  coalesce(p.exact_date, p.upper_date) >= (select coalesce(point_born.exact_date, point_born.lower_date) as born
                                                         from   points point_born
                                                         where  point_born.deck_id = $2
                                                                and point_born.kind = 'point_begin'::point_kind)
                and coalesce(p.exact_date, p.lower_date) <= coalesce((select coalesce(point_died.exact_date, point_died.upper_date) as died
                                                                      from   points point_died
                                                                      where  point_died.deck_id = $2
                                                                             and point_died.kind = 'point_end'::point_kind), CURRENT_DATE)
                and p.deck_id = d.id
                and d.id <> $2
                and d.user_id = $1
         )
         order by date",
        &[&user_id, &deck_id],
    )
    .await
}

pub(crate) async fn create_tx(
    tx: &Transaction<'_>,
    point: &interop::ProtoPoint,
    deck_id: Key,
) -> Result<interop::Point> {
    let db_point = pg::one::<Point>(
        tx,
        "INSERT INTO points(deck_id, title, kind, location_textual, longitude, latitude, location_fuzz,
                            date_textual, exact_date, lower_date, upper_date, date_fuzz)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING $table_fields",
        &[
            &deck_id,
            &point.title,
            &PointKind::from(point.kind),
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

pub(crate) async fn create(
    db_pool: &Pool,
    _user_id: Key,
    point: &interop::ProtoPoint,
    deck_id: Key,
) -> Result<interop::Point> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let interop_point = create_tx(&tx, point, deck_id).await?;

    tx.commit().await?;

    Ok(interop_point)
}

/*
pub(crate) async fn edit(
    tx: &Transaction<'_>,
    point: &interop::ProtoPoint,
    point_id: Key,
) -> Result<interop::Point> {
    let db_point = pg::one::<Point>(
        tx,
        "UPDATE points
         SET title = $2, kind = $3, location_textual = $4, longitude = $5, latitude = $6, location_fuzz = $7, date_textual = $8, exact_date = $9, lower_date = $10, upper_date = $11, date_fuzz = $12
         WHERE id = $1
         RETURNING $table_fields",
        &[
            &point_id,
            &point.title,
            &point.kind,
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
        "DELETE FROM points
         WHERE deck_id = $1",
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
