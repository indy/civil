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
    let conn = sqlite_pool.get()?;

    let (deck, _origin) = decks::deckbase_get_or_create(&conn, user_id, DeckKind::Idea, &title)?;

    Ok(deck.into())
}

pub(crate) fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::IdeasListings> {
    let conn = sqlite_pool.get()?;
    let recent = sqlite::many(
        &conn,
        "select id, name, created_at, graph_terminator
                               from decks
                               where user_id = ?1 and kind = 'idea'
                               order by created_at desc
                               limit 20",
        params![&user_id],
        idea_from_row,
    )?;
    let orphans = sqlite::many(&conn,
                              "select id, name, created_at, graph_terminator
                               from decks
                               where id not in (select deck_id
                                                from notes_decks
                                                group by deck_id)
                               and id not in (select n.deck_id
                                              from notes n inner join notes_decks nd on n.id = nd.note_id
                                              group by n.deck_id)
                               and kind = 'idea'
                               and user_id = ?1
                               order by created_at desc",
                              params![&user_id], idea_from_row)?;
    let unnoted = sqlite::many(
        &conn,
        "select d.id, d.name, d.created_at, d.graph_terminator
                               from decks d left join notes n on d.id = n.deck_id
                               where n.deck_id is null
                                     and d.kind='idea'
                                     and d.user_id=?1
                               order by d.created_at desc",
        params![&user_id],
        idea_from_row,
    )?;

    Ok(interop::IdeasListings {
        recent,
        orphans,
        unnoted,
    })
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Idea>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT id, name, created_at, graph_terminator
                  FROM decks
                  WHERE user_id = ?1 and kind = 'idea'
                  ORDER BY name",
        params![&user_id],
        idea_from_row,
    )
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key, idea_id: Key) -> Result<interop::Idea> {
    let conn = sqlite_pool.get()?;

    let deck = sqlite::one(
        &conn,
        decks::DECKBASE_QUERY,
        params![&user_id, &idea_id, &DeckKind::Idea.to_string()],
        idea_from_row,
    )?;

    Ok(deck.into())
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
