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

use crate::ai::openai_interface;
use crate::db::decks;
use crate::db::notes as db_notes;
use crate::db::sqlite::{self, FromRow, SqlitePool};
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::dialogues as interop;
use crate::interop::font::Font;
use crate::interop::notes::NoteKind;
use crate::interop::Key;

use rusqlite::{params, Connection, Row};
#[allow(unused_imports)]
use tracing::{error, info};

use std::convert::TryFrom;

#[derive(Debug, Clone)]
struct DialogueExtra {
    ai_kind: interop::AiKind,
}

impl TryFrom<(decks::DeckBase, DialogueExtra)> for interop::Dialogue {
    type Error = crate::error::Error;
    fn try_from(a: (decks::DeckBase, DialogueExtra)) -> crate::Result<interop::Dialogue> {
        let (deck, extra) = a;

        Ok(interop::Dialogue {
            id: deck.id,
            title: deck.title,
            deck_kind: DeckKind::Dialogue,
            ai_kind: extra.ai_kind,
            insignia: deck.insignia,
            font: deck.font,
            created_at: deck.created_at,
            notes: vec![],
            arrivals: vec![],
            original_chat_messages: vec![],
        })
    }
}

impl FromRow for interop::Dialogue {
    fn from_row(row: &Row) -> crate::Result<interop::Dialogue> {
        Ok(interop::Dialogue {
            id: row.get(0)?,
            title: row.get(1)?,

            deck_kind: DeckKind::Dialogue,

            ai_kind: row.get(2)?,

            insignia: row.get(4)?,
            font: row.get(5)?,

            created_at: row.get(3)?,

            notes: vec![],
            arrivals: vec![],

            original_chat_messages: vec![],
        })
    }
}

impl FromRow for openai_interface::ChatMessage {
    fn from_row(row: &Row) -> crate::Result<openai_interface::ChatMessage> {
        let r: String = row.get(1)?;
        let role = openai_interface::Role::from_str(&r)?;

        Ok(openai_interface::ChatMessage {
            note_id: row.get(0)?,
            role,
            content: row.get(2)?,
        })
    }
}

impl FromRow for interop::AiKind {
    fn from_row(row: &Row) -> crate::Result<interop::AiKind> {
        let k = row.get(0)?;
        Ok(k)
    }
}

pub(crate) fn listings(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT id, name, kind, insignia, font, graph_terminator
                FROM decks
                WHERE user_id = ?1 AND kind = 'dialogue'
                ORDER BY created_at DESC";
    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue_id: Key,
) -> crate::Result<interop::Dialogue> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, dialogue_extras.ai_kind,
                       decks.created_at, decks.insignia, decks.font
                FROM decks LEFT JOIN dialogue_extras ON dialogue_extras.deck_id = decks.id
                WHERE decks.user_id = ?1 AND decks.id = ?2 AND decks.kind = 'dialogue'";
    let mut res: interop::Dialogue = sqlite::one(&conn, stmt, params![&user_id, &dialogue_id])?;

    res.original_chat_messages = get_original_chat_messages(&conn, user_id, dialogue_id)?;

    decks::hit(&conn, dialogue_id)?;

    Ok(res)
}

fn get_original_chat_messages(
    conn: &Connection,
    user_id: Key,
    dialogue_id: Key,
) -> crate::Result<Vec<openai_interface::ChatMessage>> {
    let stmt = "SELECT msg.note_id, msg.role, msg.content
                FROM dialogue_messages AS msg
                     LEFT JOIN notes ON notes.id = msg.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE decks.user_id = ?1 AND decks.id = ?2
                ORDER BY msg.note_id";

    sqlite::many(conn, stmt, params![&user_id, &dialogue_id])
}

pub(crate) fn delete(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue_id: Key,
) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, dialogue_id)
}

impl FromRow for DialogueExtra {
    fn from_row(row: &Row) -> crate::Result<DialogueExtra> {
        Ok(DialogueExtra {
            ai_kind: row.get(1)?,
        })
    }
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue: &interop::ProtoDialogue,
    dialogue_id: Key,
) -> crate::Result<interop::Dialogue> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        dialogue_id,
        DeckKind::Dialogue,
        &dialogue.title,
        graph_terminator,
        dialogue.insignia,
        dialogue.font,
    )?;

    let sql_query: &str = "SELECT deck_id, ai_kind
                           FROM dialogue_extras
                           WHERE deck_id = ?1";

    let dialogue_extras: DialogueExtra = sqlite::one(&tx, sql_query, params![&dialogue_id])?;

    let mut res: interop::Dialogue = (edited_deck, dialogue_extras).try_into()?;
    res.original_chat_messages = get_original_chat_messages(&tx, user_id, dialogue_id)?;

    tx.commit()?;

    Ok(res)
}

pub(crate) fn create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    proto_dialogue: interop::ProtoDialogue,
) -> crate::Result<interop::Dialogue> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let deck = decks::deckbase_create(
        &tx,
        user_id,
        DeckKind::Dialogue,
        &proto_dialogue.title,
        proto_dialogue.font,
    )?;

    let dialogue_extras: DialogueExtra = sqlite::one(
        &tx,
        "INSERT INTO dialogue_extras(deck_id, ai_kind)
         VALUES (?1, ?2)
         RETURNING deck_id, ai_kind",
        params![&deck.id, &proto_dialogue.ai_kind.to_string()],
    )?;

    let mut new_prev: Option<Key> = None;

    for chat_message in proto_dialogue.messages {
        if chat_message.content.is_empty() {
            // this empty check was on the client side, moving it hear,
            // although not sure how often it's triggered
            //
            continue;
        }

        let append_chat_message = openai_interface::AppendChatMessage {
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

    (deck, dialogue_extras).try_into()
}

pub(crate) fn add_chat_message(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    chat_message: openai_interface::AppendChatMessage,
) -> crate::Result<Key> {
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
    chat_message: openai_interface::AppendChatMessage,
) -> crate::Result<Key> {
    // check if content is empty???

    let font = match chat_message.role {
        openai_interface::Role::User => Font::Cursive,
        openai_interface::Role::Assistant => Font::AI,
        openai_interface::Role::System => Font::Serif,
    };

    let new_note = db_notes::create_common(
        conn,
        user_id,
        deck_id,
        font,
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
) -> crate::Result<(interop::AiKind, Vec<openai_interface::ChatMessage>)> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT notes.id, dm.role, dm.content
                FROM dialogue_messages AS dm
                     LEFT JOIN notes ON notes.id = dm.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE
                      decks.user_id=?1 AND decks.id = ?2
                ORDER BY dm.id";

    let messages: Vec<openai_interface::ChatMessage> =
        sqlite::many(&conn, stmt, params![&user_id, &deck_id])?;

    let stmt = "SELECT ai_kind FROM dialogue_extras WHERE deck_id = ?1";
    let ai_kind = sqlite::one(&conn, stmt, params![&deck_id])?;

    Ok((ai_kind, messages))
}
