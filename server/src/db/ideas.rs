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
use crate::db::sqlite::{self, FromRow, SqlitePool};
use crate::interop::decks::{DeckKind, Pagination, SlimDeck};
use crate::interop::font::Font;
use crate::interop::ideas::{Idea, ProtoIdea};
use crate::interop::Key;
use rusqlite::{params, Row};

#[allow(unused_imports)]
use tracing::info;

impl FromRow for Idea {
    fn from_row(row: &Row) -> crate::Result<Idea> {
        Ok(Idea {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> crate::Result<Idea> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Idea, title, Font::Serif)?;

    tx.commit()?;
    Ok(deck.into())
}

pub(crate) fn recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = 'idea'
                ORDER BY created_at DESC
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*) FROM decks where user_id=?1 AND kind='idea';";
    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn orphans(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE id NOT IN (SELECT deck_id
                                 FROM refs
                                 GROUP BY deck_id)
                AND id NOT IN (SELECT n.deck_id
                               FROM notes n INNER JOIN refs r ON n.id = r.note_id
                               GROUP BY n.deck_id)
                AND kind = 'idea'
                AND user_id = ?1
                ORDER BY created_at DESC
                LIMIT ?2
                OFFSET ?3";

    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM decks
                WHERE id NOT IN (SELECT deck_id
                                 FROM refs
                                 GROUP BY deck_id)
                AND id NOT IN (SELECT n.deck_id
                               FROM notes n INNER JOIN refs r ON n.id = r.note_id
                               GROUP BY n.deck_id)
                AND kind = 'idea'
                AND user_id = ?1";
    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn unnoted(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact
                FROM decks d LEFT JOIN notes n ON (d.id = n.deck_id AND n.kind != 4)
                WHERE n.deck_id IS NULL
                AND d.kind='idea'
                AND d.user_id=?1
                ORDER BY d.created_at DESC
                LIMIT ?2
                OFFSET ?3";
    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM decks d LEFT JOIN notes n ON (d.id = n.deck_id AND n.kind != 4)
                WHERE n.deck_id IS NULL
                AND d.kind='idea'
                AND d.user_id=?1";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<Idea>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, created_at, graph_terminator, insignia, font
                FROM decks
                WHERE user_id = ?1 AND kind = 'idea'
                ORDER BY name";

    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key, idea_id: Key) -> crate::Result<Idea> {
    let conn = sqlite_pool.get()?;

    let deck: Idea = sqlite::one(
        &conn,
        decks::DECKBASE_QUERY,
        params![&user_id, &idea_id, &DeckKind::Idea.to_string()],
    )?;

    decks::hit(&conn, idea_id)?;

    Ok(deck)
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    idea: &ProtoIdea,
    idea_id: Key,
) -> crate::Result<Idea> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        idea_id,
        DeckKind::Idea,
        &idea.title,
        idea.graph_terminator,
        idea.insignia,
        idea.font,
        0, // isg fix
    )?;

    tx.commit()?;
    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, idea_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, idea_id)
}
