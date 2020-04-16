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
use crate::interop::events as interop;
use crate::interop::Key;
use crate::persist::decks;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct EventDerived {
    id: Key,
    name: String,
    prime_date: Option<chrono::NaiveDate>,
}


impl From<EventDerived> for interop::Event {
    fn from(e: EventDerived) -> interop::Event {
        interop::Event {
            id: e.id,
            title: e.name,

            sort_date: e.prime_date,

            points: None,
            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "decks")]
struct Event {
    id: Key,
    name: String,
}

impl From<Event> for interop::Event {
    fn from(e: Event) -> interop::Event {
        interop::Event {
            id: e.id,
            title: e.name,

            sort_date: None,

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
    event: &interop::ProtoEvent,
) -> Result<interop::Event> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let db_event = pg::one::<Event>(
        &tx,
        include_str!("sql/events_create.sql"),
        &[&user_id, &event.title],
    )
    .await?;

    tx.commit().await?;

    Ok(interop::Event {
        id: db_event.id,
        title: db_event.name,

        sort_date: None,
        points: None,

        notes: None,
        decks_in_notes: None,
        linkbacks_to_decks: None,
    })
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Event>> {
    pg::many_from::<EventDerived, interop::Event>(
        db_pool,
        include_str!("sql/events_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, event_id: Key) -> Result<interop::Event> {
    pg::one_from::<Event, interop::Event>(
        db_pool,
        include_str!("sql/events_get.sql"),
        &[&user_id, &event_id],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    updated_event: &interop::ProtoEvent,
    event_id: Key,
) -> Result<interop::Event> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        include_str!("sql/events_edit.sql"),
        &[&user_id, &event_id, &updated_event.title],
    )
    .await?;

    tx.commit().await?;

    let altered_event = get(db_pool, user_id, event_id).await?;

    Ok(altered_event)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, event_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, event_id).await
}
