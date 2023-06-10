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

use std::str::FromStr;

use crate::db::decks;
use crate::db::notes as db_notes;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::{Error, Result};
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::dialogues as interop;
use crate::interop::dialogues::Role;
use crate::interop::notes::NoteKind;
use crate::interop::Key;

use rusqlite::{params, Connection, Row};
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
            original_chat_messages: vec![],
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

        original_chat_messages: vec![],
    })
}

pub(crate) fn listing(sqlite_pool: &SqlitePool, user_id: Key) -> Result<Vec<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, kind, insignia
                FROM decks
                WHERE user_id = ?1 AND kind = 'dialogue'
                ORDER BY created_at DESC";
    sqlite::many(&conn, stmt, params![&user_id], decks::decksimple_from_row)
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue_id: Key,
) -> Result<interop::Dialogue> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, dialogue_extras.kind,
                       decks.created_at, decks.insignia
                FROM decks LEFT JOIN dialogue_extras ON dialogue_extras.deck_id = decks.id
                WHERE decks.user_id = ?1 AND decks.id = ?2 AND decks.kind = 'dialogue'";
    let mut res = sqlite::one(&conn, stmt, params![&user_id, &dialogue_id], from_row)?;

    res.original_chat_messages = get_original_chat_messages(&conn, user_id, dialogue_id)?;

    decks::hit(&conn, dialogue_id)?;

    Ok(res)
}

fn get_original_chat_messages(
    conn: &Connection,
    user_id: Key,
    dialogue_id: Key,
) -> Result<Vec<interop::OriginalChatMessage>> {
    fn chat_message_from_row(row: &Row) -> Result<interop::OriginalChatMessage> {
        let r: String = row.get(1)?;
        let role = Role::from_str(&r)?;

        Ok(interop::OriginalChatMessage {
            note_id: row.get(0)?,
            role,
            content: row.get(2)?,
        })
    }

    let stmt = "SELECT msg.note_id, msg.role, msg.content
                FROM dialogue_messages AS msg
                     LEFT JOIN notes ON notes.id = msg.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE decks.user_id = ?1 AND decks.id = ?2
                ORDER BY msg.note_id";

    sqlite::many(
        conn,
        stmt,
        params![&user_id, &dialogue_id],
        chat_message_from_row,
    )
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

    let mut res: interop::Dialogue = (edited_deck, dialogue_extras).into();
    res.original_chat_messages = get_original_chat_messages(&tx, user_id, dialogue_id)?;

    tx.commit()?;

    Ok(res)
}

pub(crate) fn create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    proto_dialogue: interop::ProtoDialogue,
) -> Result<interop::Dialogue> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let deck = decks::deckbase_create(&tx, user_id, DeckKind::Dialogue, &proto_dialogue.title)?;

    let dialogue_extras = sqlite::one(
        &tx,
        "INSERT INTO dialogue_extras(deck_id, kind)
         VALUES (?1, ?2)
         RETURNING deck_id, kind",
        params![&deck.id, &proto_dialogue.kind],
        dialogue_extra_from_row,
    )?;

    let mut new_prev: Option<Key> = None;

    for chat_message in proto_dialogue.messages {
        if chat_message.content.is_empty() {
            // this empty check was on the client side, moving it hear,
            // although not sure how often it's triggered
            //
            continue;
        }

        let append_chat_message = interop::AppendChatMessage {
            prev_note_id: new_prev,
            role: chat_message.role,
            content: chat_message.content,
        };

        new_prev = Some(create_chat_message(
            &tx,
            user_id,
            deck.id,
            append_chat_message,
        )?);
    }

    tx.commit()?;

    Ok((deck, dialogue_extras).into())
}

pub(crate) fn add_chat_message(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    chat_message: interop::AppendChatMessage,
) -> Result<Key> {
    // check if content is empty???

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let id = create_chat_message(&tx, user_id, deck_id, chat_message)?;

    tx.commit()?;

    Ok(id)
}

// returns the new note id
fn create_chat_message(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    chat_message: interop::AppendChatMessage,
) -> Result<Key> {
    // check if content is empty???

    let new_note = db_notes::create_common(
        conn,
        user_id,
        deck_id,
        NoteKind::Note,
        None,
        &chat_message.content,
        chat_message.prev_note_id,
        None,
    )?;

    // save the original text in dialogue_messages, this is used when reconstructing the original message
    //
    sqlite::zero(
        conn,
        "INSERT INTO dialogue_messages(role, content, note_id)
             VALUES (?1, ?2, ?3)",
        params![
            &chat_message.role.to_string(),
            &chat_message.content,
            new_note.id
        ],
    )?;

    Ok(new_note.id)
}

pub(crate) fn get_chat_history(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::ChatMessage>> {
    fn chat_message_from_row(row: &Row) -> Result<interop::ChatMessage> {
        let r: String = row.get(0)?;
        let role = Role::from_str(&r)?;

        Ok(interop::ChatMessage {
            role,
            content: row.get(1)?,
        })
    }

    let conn = sqlite_pool.get()?;

    let stmt = "SELECT dm.role, dm.content
                FROM dialogue_messages AS dm
                     LEFT JOIN notes ON notes.id = dm.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE
                      decks.user_id=?1 AND decks.id = ?2
                ORDER BY dm.id";

    sqlite::many(
        &conn,
        stmt,
        params![&user_id, &deck_id],
        chat_message_from_row,
    )
}
