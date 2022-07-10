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


use crate::error::Result;
use crate::interop::Key;

use crate::interop::uploader as interop;

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

pub(crate) fn sqlite_get_image_count(sqlite_pool: &SqlitePool, user_id: Key) -> Result<i32> {
    let conn = sqlite_pool.get()?;

    fn from_row(row: &Row) -> Result<i32> {
        let i = row.get(0)?;
        Ok(i)
    }

    sqlite::one(
        &conn,
        "SELECT u.id,
                u.image_count
         FROM users u
         WHERE u.id = ?1",
        params![&user_id],
        from_row
    )
}

pub(crate) fn sqlite_set_image_count(sqlite_pool: &SqlitePool, user_id: Key, new_count: i32) -> Result<()> {
    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "UPDATE users
         SET image_count = ?2
         WHERE id = ?1",
        params![&user_id, &new_count],
    )?;

    Ok(())
}

pub(crate) fn sqlite_add_image_entry(sqlite_pool: &SqlitePool, user_id: Key, filename: &str) -> Result<()> {
    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "INSERT INTO images(user_id, filename)
         VALUES (?1, ?2)",
        params![&user_id, &filename],
    )?;

    Ok(())
}
