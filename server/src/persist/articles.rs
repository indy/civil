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
use crate::interop::articles as interop;
use crate::interop::Key;
use crate::persist::decks;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Article {
    id: Key,
    name: String,
    source: Option<String>,
    author: Option<String>,
}

impl From<Article> for interop::Article {
    fn from(a: Article) -> interop::Article {
        interop::Article {
            id: a.id,
            title: a.name,
            source: a.source,
            author: a.author,

            notes: None,

            tags_in_notes: None,
            decks_in_notes: None,

            linkbacks_to_decks: None,
            linkbacks_to_tags: None,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Article>> {
    pg::many_from::<Article, interop::Article>(
        db_pool,
        include_str!("sql/articles_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, article_id: Key) -> Result<interop::Article> {
    pg::one_from::<Article, interop::Article>(
        db_pool,
        include_str!("sql/articles_get.sql"),
        &[&user_id, &article_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    article: &interop::CreateArticle,
) -> Result<interop::Article> {
    pg::one_from::<Article, interop::Article>(
        db_pool,
        include_str!("sql/articles_create.sql"),
        &[&user_id, &article.title, &article.source, &article.author],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    article: &interop::Article,
    article_id: Key,
) -> Result<interop::Article> {
    pg::one_from::<Article, interop::Article>(
        db_pool,
        include_str!("sql/articles_edit.sql"),
        &[&user_id, &article_id, &article.title, &article.source, &article.author],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, article_id: Key) -> Result<()> {
    decks::delete(db_pool, article_id, user_id).await
}
