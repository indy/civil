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

use crate::db::decks::DECKBASE_QUERY;
use crate::db::notes as notes_db;
use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, decks};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, ProtoSlimDeck};
use crate::interop::font::Font;
use crate::interop::ideas::Idea;
use rusqlite::{Row, named_params};

impl FromRow for Idea {
    fn from_row(row: &Row) -> rusqlite::Result<Idea> {
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
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Idea, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Idea,
        &title,
        false,
        0,
        Font::Serif,
        1,
    )?;

    tx.commit()?;

    let mut idea: Idea = deck.into();

    idea.notes = notes_db::notes_for_deck(conn, idea.id)?;
    idea.arrivals = notes_db::arrivals_for_deck(conn, idea.id)?;

    Ok(idea)
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Idea>, DbError> {
    let stmt = "SELECT id, name, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = :user_id AND kind = :deck_kind
                ORDER BY name";

    sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Idea},
    )
}

pub(crate) fn convert(
    conn: &rusqlite::Connection,
    user_id: Key,
    idea_id: Key,
) -> Result<Option<Idea>, DbError> {
    let mut idea: Option<Idea> = sqlite::one_optional(
        &conn,
        DECKBASE_QUERY,
        named_params! {":user_id": user_id, ":deck_id": idea_id, ":deck_kind": DeckKind::Idea},
    )?;

    if let Some(ref mut i) = idea {
        i.notes = notes_db::notes_for_deck(conn, idea_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, idea_id)?;
    }

    let target_kind = DeckKind::Concept;
    let stmt = "UPDATE decks
                SET kind = :deck_kind
                WHERE user_id = :user_id AND id = :deck_id";
    sqlite::zero(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": idea_id, ":deck_kind": target_kind},
    )?;

    Ok(idea)
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    idea_id: Key,
) -> Result<Option<Idea>, DbError> {
    let mut idea: Option<Idea> = sqlite::one_optional(
        &conn,
        DECKBASE_QUERY,
        named_params! {":user_id": user_id, ":deck_id": idea_id, ":deck_kind": DeckKind::Idea},
    )?;

    if let Some(ref mut i) = idea {
        i.notes = notes_db::notes_for_deck(conn, idea_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, idea_id)?;
        decks::hit(&conn, idea_id)?;
    }

    Ok(idea)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    idea: ProtoSlimDeck,
    idea_id: Key,
) -> Result<Idea, DbError> {
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
        idea.impact,
    )?;

    tx.commit()?;

    let mut idea: Idea = deck.into();

    idea.notes = notes_db::notes_for_deck(conn, idea_id)?;
    idea.arrivals = notes_db::arrivals_for_deck(conn, idea_id)?;

    Ok(idea)
}
