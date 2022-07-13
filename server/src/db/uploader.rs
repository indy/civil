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

use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::uploader as interop;
use crate::interop::Key;

use rusqlite::{params, Row};

fn user_uploaded_image_from_row(row: &Row) -> Result<interop::UserUploadedImage> {
    Ok(interop::UserUploadedImage {
        filename: row.get(0)?,
    })
}

pub(crate) fn get_recent(
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
        user_uploaded_image_from_row,
    )
}

pub(crate) fn get_image_count(sqlite_pool: &SqlitePool, user_id: Key) -> Result<i32> {
    let conn = sqlite_pool.get()?;

    fn from_row(row: &Row) -> Result<i32> {
        let i = row.get(0)?;
        Ok(i)
    }

    sqlite::one(
        &conn,
        "SELECT image_count
         FROM users
         WHERE id = ?1",
        params![&user_id],
        from_row,
    )
}

pub(crate) fn set_image_count(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    new_count: i32,
) -> Result<()> {
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

pub(crate) fn add_image_entry(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    filename: &str,
) -> Result<()> {
    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "INSERT INTO images(user_id, filename)
         VALUES (?1, ?2)",
        params![&user_id, &filename],
    )?;

    Ok(())
}
