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
use crate::interop::ideas as interop;
use crate::interop::Key;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Idea {
    id: Key,
    name: String,
}

impl From<Idea> for interop::Idea {
    fn from(a: Idea) -> interop::Idea {
        interop::Idea {
            id: a.id,
            title: a.name,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,

            search_results: None,
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
    idea: &interop::ProtoIdea,
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
    idea: &interop::ProtoIdea,
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
    decks::delete(db_pool, user_id, idea_id).await
}
