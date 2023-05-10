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
use crate::error::{Error, Result};
use crate::interop::decks::DeckKind;
use crate::interop::dialogues as interop;
use crate::interop::Key;
use rusqlite::{params, Row};

use tracing::error;

#[derive(Debug, Clone)]
struct DialogueExtra {
    kind: String,
}

impl From<(decks::DeckBase, DialogueExtra)> for interop::Dialogue {
    fn from(a: (decks::DeckBase, DialogueExtra)) -> interop::Dialogue {
        let (deck, extra) = a;
        interop::Dialogue {
            id: deck.id,
            title: deck.title,
            kind: extra.kind,
            insignia: deck.insignia,
            created_at: deck.created_at,
            notes: None,
            refs: None,
            backnotes: None,
            backrefs: None,
            flashcards: None,
        }
    }
}

fn from_row(row: &Row) -> Result<interop::Dialogue> {
    Ok(interop::Dialogue {
        id: row.get(0)?,
        title: row.get(1)?,

        kind: row.get(2)?,

        insignia: row.get(4)?,

        created_at: row.get(3)?,

        notes: None,

        refs: None,

        backnotes: None,
        backrefs: None,

        flashcards: None,
    })
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<interop::Dialogue>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, dialogue_extras.kind,
                       decks.created_at, decks.insignia
                FROM decks LEFT JOIN dialogue_extras ON dialogue_extras.deck_id = decks.id
                WHERE decks.user_id = ?1 AND decks.kind = 'dialogue'
                ORDER BY decks.created_at DESC";
    sqlite::many(&conn, stmt, params![&user_id], from_row)
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue_id: Key,
) -> Result<interop::Dialogue> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, dialogue_extras.kind
                       decks.created_at, decks.insignia
                FROM decks LEFT JOIN dialogue_extras ON dialogue_extras.deck_id = decks.id
                WHERE decks.user_id = ?1 AND decks.id = ?2 AND decks.kind = 'dialogue'";
    let res = sqlite::one(&conn, stmt, params![&user_id, &dialogue_id], from_row)?;

    decks::hit(&conn, dialogue_id)?;

    Ok(res)
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, dialogue_id: Key) -> Result<()> {
    decks::delete(sqlite_pool, user_id, dialogue_id)
}

fn dialogue_extra_from_row(row: &Row) -> Result<DialogueExtra> {
    Ok(DialogueExtra { kind: row.get(1)? })
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue: &interop::ProtoDialogue,
    dialogue_id: Key,
) -> Result<interop::Dialogue> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        dialogue_id,
        DeckKind::Article,
        &dialogue.title,
        graph_terminator,
        dialogue.insignia,
    )?;

    let stmt = "SELECT deck_id, kind
                FROM dialogue_extras
                WHERE deck_id = ?1";
    let dialogue_extras_exists =
        sqlite::many(&tx, stmt, params![&dialogue_id], dialogue_extra_from_row)?;

    let sql_query: &str = match dialogue_extras_exists.len() {
        0 => {
            "INSERT INTO dialogue_extras(deck_id, kind)
              VALUES (?1, ?2)
              RETURNING deck_id, kind"
        }
        1 => {
            "UPDATE dialogue_extras
              SET kind = ?2
              WHERE deck_id = ?1
              RETURNING deck_id, kind"
        }
        _ => {
            // should be impossible to get here since deck_id
            // is a primary key in the article_extras table
            error!(
                "multiple dialogue_extras entries for dialogue: {}",
                &dialogue_id
            );
            return Err(Error::TooManyFound);
        }
    };

    let dialogue_extras = sqlite::one(
        &tx,
        sql_query,
        params![&dialogue_id, &dialogue.kind,],
        dialogue_extra_from_row,
    )?;

    tx.commit()?;

    Ok((edited_deck, dialogue_extras).into())
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> Result<interop::Dialogue> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let kind = "";

    let (deck, origin) = decks::deckbase_get_or_create(&tx, user_id, DeckKind::Dialogue, title)?;

    let article_extras = match origin {
        decks::DeckBaseOrigin::Created => sqlite::one(
            &tx,
            "INSERT INTO dialogue_extras(deck_id, kind)
             VALUES (?1, ?2)
             RETURNING deck_id, kind",
            params![&deck.id, &kind],
            dialogue_extra_from_row,
        )?,
        decks::DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "select deck_id, kind
             from dialogue_extras
             where deck_id=?1",
            params![&deck.id],
            dialogue_extra_from_row,
        )?,
    };

    tx.commit()?;

    Ok((deck, article_extras).into())
}
