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
use crate::interop::tags as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "tags")]
pub struct Tag {
    pub id: Key,
    pub name: String,
}

impl From<Tag> for interop::Tag {
    fn from(s: Tag) -> interop::Tag {
        interop::Tag {
            id: s.id,
            name: s.name,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Tag>> {
    pg::many_from::<Tag, interop::Tag>(db_pool, include_str!("sql/tags_all.sql"), &[&user_id]).await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, tag_id: Key) -> Result<interop::Tag> {
    pg::one_from::<Tag, interop::Tag>(
        db_pool,
        include_str!("sql/tags_get.sql"),
        &[&user_id, &tag_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    tag: &interop::CreateTag,
) -> Result<interop::Tag> {
    pg::one_from::<Tag, interop::Tag>(
        db_pool,
        include_str!("sql/tags_create.sql"),
        &[&user_id, &tag.name],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    tag: &interop::Tag,
    tag_id: Key,
) -> Result<interop::Tag> {
    pg::one_from::<Tag, interop::Tag>(
        db_pool,
        include_str!("sql/tags_edit.sql"),
        &[&user_id, &tag_id, &tag.name],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, tag_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    // todo: delete all edges connected with this tag

    // notes::delete_all_notes_connected_with_deck(&tx, id, user_id).await?;
    // edges::delete_all_edges_connected_with_deck(&tx, id).await?;

    let stmt = include_str!("sql/tags_delete.sql");
    pg::zero(&tx, &stmt, &[&tag_id, &user_id]).await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn create_tx(
    tx: &Transaction<'_>,
    user_id: Key,
    tag_name: &str,
) -> Result<interop::Tag> {
    let res = pg::one::<Tag>(
        tx,
        include_str!("sql/tags_create.sql"),
        &[&user_id, &tag_name],
    )
    .await?;

    Ok(res.into())
}
