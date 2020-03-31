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
use crate::interop::books as interop;
use crate::interop::Key;
use crate::persist::decks;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Book {
    id: Key,
    name: String,
    source: Option<String>,
}

impl From<Book> for interop::Book {
    fn from(a: Book) -> interop::Book {
        interop::Book {
            id: a.id,
            title: a.name,
            author: a.source,

            notes: None,
            quotes: None,

            tags_in_notes: None,
            people_in_notes: None,
            subjects_in_notes: None,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Book>> {
    pg::many_from::<Book, interop::Book>(db_pool, include_str!("sql/books_all.sql"), &[&user_id])
        .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, book_id: Key) -> Result<interop::Book> {
    pg::one_from::<Book, interop::Book>(
        db_pool,
        include_str!("sql/books_get.sql"),
        &[&user_id, &book_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    book: &interop::CreateBook,
) -> Result<interop::Book> {
    pg::one_from::<Book, interop::Book>(
        db_pool,
        include_str!("sql/books_create.sql"),
        &[&user_id, &book.title, &book.author],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    book: &interop::Book,
    book_id: Key,
) -> Result<interop::Book> {
    pg::one_from::<Book, interop::Book>(
        db_pool,
        include_str!("sql/books_edit.sql"),
        &[&user_id, &book_id, &book.title, &book.author],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, book_id: Key) -> Result<()> {
    decks::delete(db_pool, book_id, user_id).await
}
