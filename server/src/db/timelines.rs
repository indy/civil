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
use crate::db::decks;
use crate::error::{Error, Result};
use crate::interop::timelines as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct TimelineDerived {
    id: Key,
    name: String,
}

impl From<TimelineDerived> for interop::Timeline {
    fn from(e: TimelineDerived) -> interop::Timeline {
        interop::Timeline {
            id: e.id,
            title: e.name,

            points: None,
            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct Timeline {
    id: Key,
    name: String,
}

impl From<Timeline> for interop::Timeline {
    fn from(e: Timeline) -> interop::Timeline {
        interop::Timeline {
            id: e.id,
            title: e.name,

            points: None,
            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    timeline: &interop::ProtoTimeline,
) -> Result<interop::Timeline> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let db_timeline = pg::one::<Timeline>(
        &tx,
        include_str!("sql/timelines_create.sql"),
        &[&user_id, &timeline.title],
    )
    .await?;

    tx.commit().await?;

    Ok(interop::Timeline {
        id: db_timeline.id,
        title: db_timeline.name,

        points: None,

        notes: None,
        decks_in_notes: None,
        linkbacks_to_decks: None,
    })
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Timeline>> {
    pg::many_from::<TimelineDerived, interop::Timeline>(
        db_pool,
        include_str!("sql/timelines_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, timeline_id: Key) -> Result<interop::Timeline> {
    pg::one_from::<Timeline, interop::Timeline>(
        db_pool,
        include_str!("sql/timelines_get.sql"),
        &[&user_id, &timeline_id],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    updated_timeline: &interop::ProtoTimeline,
    timeline_id: Key,
) -> Result<interop::Timeline> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        include_str!("sql/timelines_edit.sql"),
        &[&user_id, &timeline_id, &updated_timeline.title],
    )
    .await?;

    tx.commit().await?;

    let altered_timeline = get(db_pool, user_id, timeline_id).await?;

    Ok(altered_timeline)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, timeline_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, timeline_id).await
}
