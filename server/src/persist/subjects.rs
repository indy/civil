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
use crate::interop::subjects as interop;
use crate::interop::Key;
use crate::persist::decks;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Subject {
    id: Key,
    name: String,
}

impl From<Subject> for interop::Subject {
    fn from(s: Subject) -> interop::Subject {
        interop::Subject {
            id: s.id,
            name: s.name,

            notes: None,
            quotes: None,

            people_referenced: None,
            subjects_referenced: None,

            mentioned_by_people: None,
            mentioned_in_subjects: None,
            mentioned_in_articles: None,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Subject>> {
    pg::many_from::<Subject, interop::Subject>(
        db_pool,
        include_str!("sql/subjects_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<interop::Subject> {
    pg::one_from::<Subject, interop::Subject>(
        db_pool,
        include_str!("sql/subjects_get.sql"),
        &[&user_id, &subject_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    subject: &interop::CreateSubject,
    user_id: Key,
) -> Result<interop::Subject> {
    pg::one_from::<Subject, interop::Subject>(
        db_pool,
        include_str!("sql/subjects_create.sql"),
        &[&user_id, &subject.name],
    )
    .await
}

pub(crate) async fn edit(
    db_pool: &Pool,
    subject: &interop::Subject,
    subject_id: Key,
    user_id: Key,
) -> Result<interop::Subject> {
    pg::one_from::<Subject, interop::Subject>(
        db_pool,
        include_str!("sql/subjects_edit.sql"),
        &[&user_id, &subject_id, &subject.name],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<()> {
    decks::delete(db_pool, subject_id, user_id).await
}
