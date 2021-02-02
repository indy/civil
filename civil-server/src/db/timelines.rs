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

            refs: None,
            backrefs: None,
        }
    }
}

impl From<decks::DeckBase> for interop::Timeline {
    fn from(e: decks::DeckBase) -> interop::Timeline {
        interop::Timeline {
            id: e.id,
            title: e.name,

            points: None,
            notes: None,

            refs: None,
            backrefs: None,
        }
    }
}

pub(crate) async fn create(db_pool: &Pool, user_id: Key, title: &str) -> Result<interop::Timeline> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_create(&tx, user_id, DeckKind::Timeline, &title).await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Timeline>> {
    pg::many_from::<TimelineDerived, interop::Timeline>(
        db_pool,
        "select id, name
         from decks
         where user_id = $1 and kind = 'timeline'::deck_kind
         order by created_at desc",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(
    db_pool: &Pool,
    user_id: Key,
    timeline_id: Key,
) -> Result<interop::Timeline> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_get(&tx, user_id, timeline_id, DeckKind::Timeline).await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    timeline: &interop::ProtoTimeline,
    timeline_id: Key,
) -> Result<interop::Timeline> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let graph_terminator = false;
    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        timeline_id,
        DeckKind::Timeline,
        &timeline.title,
        graph_terminator,
    )
    .await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, timeline_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, timeline_id).await
}
