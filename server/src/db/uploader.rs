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
use crate::error::{Error, Result};
use crate::interop::Key;

use crate::interop::uploader as interop;

use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "users")]
struct UserImageCount {
    id: Key,
    image_count: i32,
}

impl From<UserImageCount> for i32 {
    fn from(e: UserImageCount) -> i32 {
        e.image_count
    }
}

#[derive(Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "images")]
struct UserUploadedImage {
    filename: String,
}

impl From<UserUploadedImage> for interop::UserUploadedImage {
    fn from(e: UserUploadedImage) -> interop::UserUploadedImage {
        interop::UserUploadedImage {
            filename: e.filename,
        }
    }
}

pub(crate) async fn get_recent(
    db_pool: &Pool,
    user_id: Key,
) -> Result<Vec<interop::UserUploadedImage>> {
    pg::many_from::<UserUploadedImage, interop::UserUploadedImage>(
        db_pool,
        "SELECT filename
         FROM images
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 15",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get_image_count(db_pool: &Pool, user_id: Key) -> Result<i32> {
    pg::one_from::<UserImageCount, i32>(
        db_pool,
        "SELECT u.id,
                u.image_count
         FROM users u
         WHERE u.id = $1",
        &[&user_id],
    )
    .await
}

pub(crate) async fn set_image_count(db_pool: &Pool, user_id: Key, new_count: i32) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        "UPDATE users
         SET image_count = $2
         WHERE id = $1",
        &[&user_id, &new_count],
    )
    .await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn add_image_entry(db_pool: &Pool, user_id: Key, filename: &str) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        "INSERT INTO images(user_id, filename)
         VALUES ($1, $2)",
        &[&user_id, &filename],
    )
    .await?;

    tx.commit().await?;

    Ok(())
}


/////////////////////////////////////////////////////


use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Row, params};

fn user_uploaded_image_from_row(row: &Row) -> Result<interop::UserUploadedImage> {
    Ok(interop::UserUploadedImage {
        filename: row.get(0)?
    })
}

pub(crate) fn sqlite_get_recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> Result<Vec<interop::UserUploadedImage>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT filename
         FROM images
         WHERE user_id = ?1
         ORDER BY created_at DESC
         LIMIT 15",
        params![&user_id],
        user_uploaded_image_from_row
    )
}
