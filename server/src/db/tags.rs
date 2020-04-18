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
use crate::error::Result;
use crate::interop::tags as interop;
use crate::interop::Key;
use deadpool_postgres::{Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Tag {
    pub id: Key,
    pub name: String,
}

impl From<Tag> for interop::Tag {
    fn from(s: Tag) -> interop::Tag {
        interop::Tag {
            id: s.id,
            name: s.name,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,

            search_results: None,
        }
    }
}

impl From<&Tag> for interop::Tag {
    fn from(s: &Tag) -> interop::Tag {
        interop::Tag {
            id: s.id,
            name: String::from(&s.name),

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,

            search_results: None,
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
    tag: &interop::ProtoTag,
) -> Result<interop::Tag> {
    let found: Vec<Tag> = pg::many_non_transactional::<Tag>(
        db_pool,
        include_str!("sql/tags_get_by_name.sql"),
        &[&user_id, &tag.name],
    )
    .await?;

    if found.len() > 0 {
        error!("tag: {} already exists", tag.name);
        Ok(interop::Tag::from(&found[0]))
    } else {
        pg::one_from::<Tag, interop::Tag>(
            db_pool,
            include_str!("sql/tags_create.sql"),
            &[&user_id, &tag.name],
        )
        .await
    }
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    tag: &interop::ProtoTag,
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
    decks::delete(db_pool, user_id, tag_id).await
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
