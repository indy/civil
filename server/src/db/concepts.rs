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
use crate::interop::concepts::Concept;
use crate::interop::decks::{DeckKind, ProtoSlimDeck};
use crate::interop::font::Font;
use rusqlite::{Row, named_params};

#[allow(unused_imports)]
use tracing::info;

impl FromRow for Concept {
    fn from_row(row: &Row) -> rusqlite::Result<Concept> {
        Ok(Concept {
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Concept, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Concept,
        &title,
        false,
        0,
        Font::Serif,
        1,
    )?;

    tx.commit()?;

    let mut concept: Concept = deck.into();

    concept.notes = notes_db::notes_for_deck(conn, concept.id)?;
    concept.arrivals = notes_db::arrivals_for_deck(conn, concept.id)?;

    Ok(concept)
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Concept>, DbError> {
    let stmt = "SELECT id, name, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = :user_id AND kind = :deck_kind
                ORDER BY name";

    sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Concept},
    )
}

pub(crate) fn convert(
    conn: &rusqlite::Connection,
    user_id: Key,
    concept_id: Key,
) -> Result<Option<Concept>, DbError> {
    let mut concept: Option<Concept> = sqlite::one_optional(
        &conn,
        DECKBASE_QUERY,
        named_params! {":user_id": user_id, ":deck_id": concept_id, ":deck_kind": DeckKind::Concept},
    )?;

    if let Some(ref mut i) = concept {
        i.notes = notes_db::notes_for_deck(conn, concept_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, concept_id)?;
    }

    let target_kind = DeckKind::Idea;
    let stmt = "UPDATE decks
                SET kind = :deck_kind
                WHERE user_id = :user_id AND id = :deck_id";
    sqlite::zero(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": concept_id, ":deck_kind": target_kind},
    )?;

    Ok(concept)
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    concept_id: Key,
) -> Result<Option<Concept>, DbError> {
    let mut concept: Option<Concept> = sqlite::one_optional(
        &conn,
        DECKBASE_QUERY,
        named_params! {":user_id": user_id, ":deck_id": concept_id, ":deck_kind": DeckKind::Concept},
    )?;

    if let Some(ref mut i) = concept {
        i.notes = notes_db::notes_for_deck(conn, concept_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, concept_id)?;
        decks::hit(&conn, concept_id)?;
    }

    Ok(concept)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    concept: ProtoSlimDeck,
    concept_id: Key,
) -> Result<Concept, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        concept_id,
        DeckKind::Concept,
        &concept.title,
        concept.graph_terminator,
        concept.insignia,
        concept.font,
        concept.impact,
    )?;

    tx.commit()?;

    let mut concept: Concept = deck.into();

    concept.notes = notes_db::notes_for_deck(conn, concept_id)?;
    concept.arrivals = notes_db::arrivals_for_deck(conn, concept_id)?;

    Ok(concept)
}
