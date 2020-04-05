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
use crate::interop::ideas as interop;
use crate::interop::Key;
use crate::persist::edges;
use crate::persist::notes;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "ideas")]
struct Idea {
    id: Key,
    title: String,
}

impl From<Idea> for interop::Idea {
    fn from(a: Idea) -> interop::Idea {
        interop::Idea {
            id: a.id,
            title: a.title,

            notes: None,

            tags_in_notes: None,
            decks_in_notes: None,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Idea>> {
    pg::many_from::<Idea, interop::Idea>(db_pool, include_str!("sql/ideas_all.sql"), &[&user_id])
        .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<interop::Idea> {
    pg::one_from::<Idea, interop::Idea>(
        db_pool,
        include_str!("sql/ideas_get.sql"),
        &[&user_id, &idea_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    idea: &interop::CreateIdea,
) -> Result<interop::Idea> {
    pg::one_from::<Idea, interop::Idea>(
        db_pool,
        include_str!("sql/ideas_create.sql"),
        &[&user_id, &idea.title],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    idea: &interop::Idea,
    idea_id: Key,
) -> Result<interop::Idea> {
    pg::one_from::<Idea, interop::Idea>(
        db_pool,
        include_str!("sql/ideas_edit.sql"),
        &[&user_id, &idea_id, &idea.title],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<()> {
    let id = idea_id;

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    notes::delete_all_notes_connected_with_idea(&tx, user_id, id).await?;
    edges::delete_all_edges_connected_with_idea(&tx, id).await?;

    let stmt = include_str!("sql/ideas_delete.sql");
    pg::zero(&tx, &stmt, &[&id, &user_id]).await?;

    tx.commit().await?;

    Ok(())
}
