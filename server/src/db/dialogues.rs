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
use crate::db::notes as notes_db;
use crate::db::notes as db_notes;
use crate::db::sqlite::{self, FromRow};
use crate::db::{db, DbError, SqlitePool};
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::dialogues as interop; // nocheckin remove this?
use crate::interop::dialogues::{Dialogue, ProtoDialogue};
use crate::interop::font::Font;
use crate::interop::notes::NoteKind;
use crate::interop::Key;

use rusqlite::{params, Row};
#[allow(unused_imports)]
use tracing::{error, info};

use std::convert::TryFrom;

#[derive(Debug, Clone)]
struct DialogueExtra {
    ai_kind: interop::AiKind,
}

impl TryFrom<(decks::DeckBase, DialogueExtra)> for interop::Dialogue {
    type Error = DbError;
    fn try_from(a: (decks::DeckBase, DialogueExtra)) -> Result<interop::Dialogue, DbError> {
        let (deck, extra) = a;

        Ok(interop::Dialogue {
            id: deck.id,
            title: deck.title,
            deck_kind: deck.deck_kind,
            created_at: deck.created_at,
            graph_terminator: deck.graph_terminator,

            insignia: deck.insignia,
            font: deck.font,
            impact: deck.impact,

            notes: vec![],
            arrivals: vec![],

            ai_kind: extra.ai_kind,
            messages: vec![],
        })
    }
}

impl FromRow for interop::Dialogue {
    fn from_row(row: &Row) -> rusqlite::Result<interop::Dialogue> {
        Ok(interop::Dialogue {
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

            ai_kind: row.get(8)?,
            messages: vec![],
        })
    }
}

// nocheckin what is this?, why is a ChatMessage implementing FromRow

impl FromRow for openai_interface::ChatMessage {
    fn from_row(row: &Row) -> rusqlite::Result<openai_interface::ChatMessage> {
        let r: String = row.get(1)?;
        match openai_interface::Role::from_str(&r) {
            Ok(role) => Ok(openai_interface::ChatMessage {
                note_id: row.get(0)?,
                role,
                content: row.get(2)?,
            }),
            Err(_) => Err(rusqlite::Error::FromSqlConversionFailure(
                1, // column index
                rusqlite::types::Type::Text,
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("invalid role: {}", r),
                )),
            )),
        }
    }
}

impl FromRow for interop::AiKind {
    fn from_row(row: &Row) -> rusqlite::Result<interop::AiKind> {
        let k = row.get(0)?;
        Ok(k)
    }
}

fn listings_conn(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<SlimDeck>, DbError> {
    // TODO: sort this by the event date in event_extras
    let stmt = "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                FROM decks
                WHERE user_id = ?1 AND kind = 'dialogue'
                ORDER BY created_at DESC";

    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) async fn listings(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Vec<SlimDeck>> {
    db(sqlite_pool, move |conn| listings_conn(conn, user_id))
        .await
        .map_err(Into::into)
}

fn get_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    dialogue_id: Key,
) -> Result<Option<Dialogue>, DbError> {
    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                       decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       dialogue_extras.ai_kind
                FROM decks LEFT JOIN dialogue_extras ON dialogue_extras.deck_id = decks.id
                WHERE decks.user_id = ?1 AND decks.id = ?2 AND decks.kind = ?3";

    let mut dialogue: Option<Dialogue> = sqlite::one_optional(
        &conn,
        stmt,
        params![user_id, dialogue_id, DeckKind::Dialogue.to_string()],
    )?;

    if let Some(ref mut i) = dialogue {
        i.notes = notes_db::notes_for_deck(conn, dialogue_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, dialogue_id)?;
        i.messages = get_original_chat_messages(&conn, user_id, dialogue_id)?;
        decks::hit(&conn, dialogue_id)?;
    }

    Ok(dialogue)
}

pub(crate) async fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue_id: Key,
) -> crate::Result<Option<Dialogue>> {
    db(sqlite_pool, move |conn| {
        get_conn(conn, user_id, dialogue_id)
    })
    .await
    .map_err(Into::into)
}

fn get_original_chat_messages(
    conn: &rusqlite::Connection,
    user_id: Key,
    dialogue_id: Key,
) -> Result<Vec<openai_interface::ChatMessage>, DbError> {
    let stmt = "SELECT msg.note_id, msg.role, msg.content
                FROM dialogue_messages AS msg
                     LEFT JOIN notes ON notes.id = msg.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE decks.user_id = ?1 AND decks.id = ?2
                ORDER BY msg.note_id";

    sqlite::many(conn, stmt, params![&user_id, &dialogue_id])
}

impl FromRow for DialogueExtra {
    fn from_row(row: &Row) -> rusqlite::Result<DialogueExtra> {
        Ok(DialogueExtra {
            ai_kind: row.get(1)?,
        })
    }
}

fn edit_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    dialogue: ProtoDialogue,
    dialogue_id: Key,
) -> Result<Dialogue, DbError> {
    let tx = conn.transaction()?;

    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        dialogue_id,
        DeckKind::Dialogue,
        &dialogue.title,
        dialogue.graph_terminator,
        dialogue.insignia,
        dialogue.font,
        dialogue.impact,
    )?;

    let sql_query: &str = "SELECT deck_id, ai_kind
                           FROM dialogue_extras
                           WHERE deck_id = ?1";

    let dialogue_extras: DialogueExtra = sqlite::one(&tx, sql_query, params![&dialogue_id])?;

    let mut dialogue: interop::Dialogue = (edited_deck, dialogue_extras).try_into()?;
    dialogue.messages = get_original_chat_messages(&tx, user_id, dialogue_id)?;

    tx.commit()?;

    dialogue.notes = notes_db::notes_for_deck(conn, dialogue_id)?;
    dialogue.arrivals = notes_db::arrivals_for_deck(conn, dialogue_id)?;

    Ok(dialogue)
}

pub(crate) async fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue: ProtoDialogue,
    dialogue_id: Key,
) -> crate::Result<Dialogue> {
    db(sqlite_pool, move |conn| {
        edit_conn(conn, user_id, dialogue, dialogue_id)
    })
    .await
    .map_err(Into::into)
}

fn create_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    proto_dialogue: ProtoDialogue,
) -> Result<Dialogue, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_create(
        &tx,
        user_id,
        DeckKind::Dialogue,
        &proto_dialogue.title,
        false,
        0,
        proto_dialogue.font,
        0,
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

        new_prev = Some(create_chat_message_conn(
            &tx,
            user_id,
            deck.id,
            append_chat_message,
        )?);
    }

    tx.commit()?;

    let mut dialogue: Dialogue = (deck, dialogue_extras).try_into()?;

    dialogue.notes = notes_db::notes_for_deck(conn, dialogue.id)?;
    dialogue.arrivals = notes_db::arrivals_for_deck(conn, dialogue.id)?;

    Ok(dialogue)
}

pub(crate) async fn create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue: ProtoDialogue,
) -> crate::Result<Dialogue> {
    db(sqlite_pool, move |conn| {
        create_conn(conn, user_id, dialogue)
    })
    .await
    .map_err(Into::into)
}

fn delete_conn(conn: &rusqlite::Connection, user_id: Key, dialogue_id: Key) -> Result<(), DbError> {
    decks::delete(&conn, user_id, dialogue_id)?;

    Ok(())
}

pub(crate) async fn delete(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    dialogue_id: Key,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| {
        delete_conn(conn, user_id, dialogue_id)
    })
    .await
    .map_err(Into::into)
}

fn add_chat_message_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
    chat_message: openai_interface::AppendChatMessage,
) -> Result<Key, DbError> {
    let tx = conn.transaction()?;

    let id = create_chat_message_conn(&tx, user_id, deck_id, chat_message)?;

    tx.commit()?;

    Ok(id)
}

pub(crate) async fn add_chat_message(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    chat_message: openai_interface::AppendChatMessage,
) -> crate::Result<Key> {
    db(sqlite_pool, move |conn| {
        add_chat_message_conn(conn, user_id, deck_id, chat_message)
    })
    .await
    .map_err(Into::into)
}

fn create_chat_message_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
    chat_message: openai_interface::AppendChatMessage,
) -> Result<Key, DbError> {
    // check if content is empty???

    let font = match chat_message.role {
        openai_interface::Role::User => Font::Cursive,
        openai_interface::Role::Assistant => Font::AI,
        openai_interface::Role::System => Font::Serif,
        openai_interface::Role::Function => Font::AI,
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

fn get_chat_history_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<(interop::AiKind, Vec<openai_interface::ChatMessage>), DbError> {
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

pub(crate) async fn get_chat_history(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<(interop::AiKind, Vec<openai_interface::ChatMessage>)> {
    db(sqlite_pool, move |conn| {
        get_chat_history_conn(conn, user_id, deck_id)
    })
    .await
    .map_err(Into::into)
}
