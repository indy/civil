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
use crate::interop::publications as interop;
use crate::interop::Key;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Publication {
    id: Key,
    name: String,
    source: Option<String>,
    author: Option<String>,
}

impl From<Publication> for interop::Publication {
    fn from(a: Publication) -> interop::Publication {
        interop::Publication {
            id: a.id,
            title: a.name,
            source: a.source,
            author: a.author,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Publication>> {
    pg::many_from::<Publication, interop::Publication>(
        db_pool,
        include_str!("sql/publications_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(
    db_pool: &Pool,
    user_id: Key,
    publication_id: Key,
) -> Result<interop::Publication> {
    pg::one_from::<Publication, interop::Publication>(
        db_pool,
        include_str!("sql/publications_get.sql"),
        &[&user_id, &publication_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    publication: &interop::ProtoPublication,
) -> Result<interop::Publication> {
    pg::one_from::<Publication, interop::Publication>(
        db_pool,
        include_str!("sql/publications_create.sql"),
        &[
            &user_id,
            &publication.title,
            &publication.source,
            &publication.author,
        ],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    publication: &interop::ProtoPublication,
    publication_id: Key,
) -> Result<interop::Publication> {
    pg::one_from::<Publication, interop::Publication>(
        db_pool,
        include_str!("sql/publications_edit.sql"),
        &[
            &user_id,
            &publication_id,
            &publication.title,
            &publication.source,
            &publication.author,
        ],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, publication_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, publication_id).await
}
