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

use crate::db::{SqlitePool, DbError};
use crate::db::sqlite::{self, FromRow};
use crate::interop::bookmarks as interop;
use crate::interop::decks::SlimDeck;
use crate::interop::Key;

use rusqlite::{params, Row};
#[allow(unused_imports)]
use tracing::{error, info};

impl FromRow for interop::Bookmark {
    fn from_row(row: &Row) -> crate::Result<interop::Bookmark> {
        let deck: SlimDeck = FromRow::from_row(row)?; // NOTE: if SlimDeck's FromRow trait is changed then so should this
        let id = row.get(8)?;

        Ok(interop::Bookmark { id, deck })
    }

    fn from_row_conn(row: &Row) -> Result<interop::Bookmark, DbError> {
        let deck: SlimDeck = FromRow::from_row_conn(row)?; // NOTE: if SlimDeck's FromRow trait is changed then so should this
        let id = row.get(8)?;

        Ok(interop::Bookmark { id, deck })
    }
}

pub(crate) fn create_bookmark(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<()> {
    let conn = sqlite_pool.get()?;
    let stmt = "INSERT INTO bookmarks(user_id, deck_id) VALUES (?1, ?2)";
    sqlite::zero(&conn, stmt, params![&user_id, &deck_id])
}

pub(crate) fn create_multiple_bookmarks(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_ids: Vec<Key>,
) -> crate::Result<()> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let stmt = "INSERT INTO bookmarks(user_id, deck_id) VALUES (?1, ?2)";
    for deck_id in deck_ids {
        sqlite::zero(&tx, stmt, params![&user_id, &deck_id])?;
    }

    tx.commit()?;

    Ok(())
}

pub(crate) fn get_bookmarks(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Vec<interop::Bookmark>> {
    let conn = sqlite_pool.get()?;
    let stmt = "select d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, b.id
                from decks d, bookmarks b
                where b.user_id = ?1 and b.deck_id = d.id";
    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn delete_bookmark(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    bookmark_id: Key,
) -> crate::Result<()> {
    let conn = sqlite_pool.get()?;
    let stmt = "DELETE FROM bookmarks WHERE user_id = ?1 and id = ?2";
    sqlite::zero(&conn, stmt, params![&user_id, &bookmark_id])
}
