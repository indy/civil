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

use crate::db::DbError;
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::bookmarks as interop;
use crate::interop::decks::SlimDeck;
use rusqlite::{Row, named_params};

#[allow(unused_imports)]
use tracing::{error, info};

impl FromRow for interop::Bookmark {
    fn from_row(row: &Row) -> rusqlite::Result<interop::Bookmark> {
        let deck: SlimDeck = FromRow::from_row(row)?; // NOTE: if SlimDeck's FromRow trait is changed then so should this
        let id = row.get("bookmark_id")?;

        Ok(interop::Bookmark { id, deck })
    }
}

pub(crate) fn create_bookmark(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<(), DbError> {
    let stmt = "INSERT INTO bookmarks(user_id, deck_id) VALUES (:user_id, :deck_id)";
    sqlite::zero(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": deck_id},
    )
}

pub(crate) fn create_multiple_bookmarks(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    deck_ids: Vec<Key>,
) -> Result<(), DbError> {
    let tx = conn.transaction()?;

    let stmt = "INSERT INTO bookmarks(user_id, deck_id) VALUES (:user_id, :deck_id)";
    for deck_id in deck_ids {
        sqlite::zero(
            &tx,
            stmt,
            named_params! {":user_id": user_id, ":deck_id": deck_id},
        )?;
    }

    tx.commit()?;

    Ok(())
}

pub(crate) fn get_bookmarks(
    conn: &rusqlite::Connection,
    user_id: Key,
) -> Result<Vec<interop::Bookmark>, DbError> {
    sqlite::many(
        &conn,
        &Qry::select_decklike()
            .comma("b.id as bookmark_id")
            .from_decklike()
            .join("bookmarks b ON b.deck_id = d.id")
            .where_clause("b.user_id = :user_id"),
        named_params! {":user_id": user_id},
    )
}

pub(crate) fn delete_bookmark(
    conn: &rusqlite::Connection,
    user_id: Key,
    bookmark_id: Key,
) -> Result<(), DbError> {
    let stmt = "DELETE FROM bookmarks WHERE user_id = :user_id and id = :bookmark_id";
    sqlite::zero(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":bookmark_id": bookmark_id},
    )
}
