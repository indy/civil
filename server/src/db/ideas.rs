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

use crate::db::decks;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::decks::DeckKind;
use crate::interop::ideas as interop;
use crate::interop::Key;
use rusqlite::{params, Row};

#[allow(unused_imports)]
use tracing::info;

fn idea_from_row(row: &Row) -> Result<interop::Idea> {
    Ok(interop::Idea {
        id: row.get(0)?,
        title: row.get(1)?,
        graph_terminator: row.get(3)?,
        created_at: row.get(2)?,
        notes: None,
        refs: None,
        backnotes: None,
        backrefs: None,
        flashcards: None,
    })
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> Result<interop::Idea> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(&tx, user_id, DeckKind::Idea, title)?;

    tx.commit()?;
    Ok(deck.into())
}

pub(crate) fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::IdeasListings> {
    let conn = sqlite_pool.get()?;

    let stmt = "select id, name, 'idea'
                from decks
                where user_id = ?1 and kind = 'idea'
                order by created_at desc
                limit 20";

    let recent = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    let stmt = "SELECT id, name, 'idea'
                FROM decks
                WHERE id NOT IN (SELECT deck_id
                                 FROM notes_decks
                                 GROUP BY deck_id)
                AND id NOT IN (SELECT n.deck_id
                               FROM notes n INNER JOIN notes_decks nd ON n.id = nd.note_id
                               GROUP BY n.deck_id)
                AND kind = 'idea'
                AND user_id = ?1
                ORDER BY created_at DESC";

    let orphans = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    let stmt = "SELECT d.id, d.name, 'idea'
                FROM decks d LEFT JOIN notes n ON (d.id = n.deck_id AND n.kind != 4)
                WHERE n.deck_id IS NULL
                AND d.kind='idea'
                AND d.user_id=?1
                ORDER BY d.created_at DESC";

    let unnoted = sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)?;

    Ok(interop::IdeasListings {
        recent,
        orphans,
        unnoted,
    })
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Idea>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, created_at, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND kind = 'idea'
                ORDER BY name";

    sqlite::many(&conn, stmt, params![&user_id], idea_from_row)
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key, idea_id: Key) -> Result<interop::Idea> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(
        &conn,
        decks::DECKBASE_QUERY,
        params![&user_id, &idea_id, &DeckKind::Idea.to_string()],
        idea_from_row,
    )?;

    decks::hit(&conn, idea_id)?;

    Ok(deck)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    idea: &interop::ProtoIdea,
    idea_id: Key,
) -> Result<interop::Idea> {
    let conn = sqlite_pool.get()?;

    let deck = decks::deckbase_edit(
        &conn,
        user_id,
        idea_id,
        DeckKind::Idea,
        &idea.title,
        idea.graph_terminator,
    )?;

    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, idea_id: Key) -> Result<()> {
    decks::delete(sqlite_pool, user_id, idea_id)
}
