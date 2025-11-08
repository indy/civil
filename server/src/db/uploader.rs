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

use std::cmp;

use crate::db::sqlite::{self, FromRow};
use crate::db::{db, DbError, SqlitePool};
use crate::interop::uploader::UserUploadedImage;
use crate::interop::Key;

use rusqlite::{params, Row};

impl FromRow for UserUploadedImage {
    fn from_row(row: &Row) -> rusqlite::Result<UserUploadedImage> {
        Ok(UserUploadedImage {
            filename: row.get(0)?,
        })
    }
}

fn get_recent_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    at_least: u8,
) -> Result<Vec<UserUploadedImage>, DbError> {
    let limit = cmp::max(at_least, 15);

    // the ORDER BY used created_at but this might not work as expected when multiple images are uploaded at once
    sqlite::many(
        &conn,
        "SELECT filename
         FROM images
         WHERE user_id = ?1
         ORDER BY id DESC
         LIMIT ?2",
        params![&user_id, &limit],
    )
}

pub(crate) async fn get_recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    at_least: u8,
) -> crate::Result<Vec<UserUploadedImage>> {
    db(sqlite_pool, move |conn| {
        get_recent_conn(conn, user_id, at_least)
    })
    .await
}

fn get_image_count_conn(conn: &rusqlite::Connection, user_id: Key) -> Result<i32, DbError> {
    sqlite::one(
        &conn,
        "SELECT image_count
         FROM users
         WHERE id = ?1",
        params![&user_id],
    )
}

pub(crate) async fn get_image_count(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<i32> {
    db(sqlite_pool, move |conn| get_image_count_conn(conn, user_id)).await
}

fn set_image_count_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    new_count: i32,
) -> Result<(), DbError> {
    sqlite::zero(
        &conn,
        "UPDATE users
         SET image_count = ?2
         WHERE id = ?1",
        params![&user_id, &new_count],
    )
}

pub(crate) async fn set_image_count(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    new_count: i32,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| {
        set_image_count_conn(conn, user_id, new_count)
    })
    .await
}

fn add_image_entry_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    filename: String,
) -> Result<(), DbError> {
    sqlite::zero(
        &conn,
        "INSERT INTO images(user_id, filename)
         VALUES (?1, ?2)",
        params![&user_id, &filename],
    )
}

pub(crate) async fn add_image_entry(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    filename: String,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| {
        add_image_entry_conn(conn, user_id, filename)
    })
    .await
}
