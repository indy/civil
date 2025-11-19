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
use crate::db::DbError;
use crate::db::decks;
use crate::db::notes as notes_db;
use crate::db::notes as db_notes;
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::dialogues as interop;
use crate::interop::dialogues::{Dialogue, ProtoDialogue};
use crate::interop::font::Font;
use crate::interop::notes::NoteKind;

use rusqlite::{Row, named_params};
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

            ai_kind: row.get("ai_kind")?,
            messages: vec![],
        })
    }
}

// todo: what is this?, why is a ChatMessage implementing FromRow

impl FromRow for openai_interface::ChatMessage {
    fn from_row(row: &Row) -> rusqlite::Result<openai_interface::ChatMessage> {
        let r: String = row.get("role")?;
        match openai_interface::Role::from_str(&r) {
            Ok(role) => Ok(openai_interface::ChatMessage {
                note_id: row.get("note_id")?,
                role,
                content: row.get("content")?,
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
        let k = row.get("ai_kind")?;
        Ok(k)
    }
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<SlimDeck>, DbError> {
    let stmt = Qry::query_decklike_all_ordered("d.created_at DESC");
    sqlite::many(
        &conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Dialogue},
    )
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    dialogue_id: Key,
) -> Result<Option<Dialogue>, DbError> {
    let mut dialogue: Option<Dialogue> = sqlite::one_optional(
        &conn,
        &Qry::select_decklike()
            .comma("dialogue_extras.ai_kind as ai_kind")
            .from_decklike()
            .left_join("dialogue_extras ON dialogue_extras.deck_id = d.id")
            .where_decklike(),
        named_params! {":user_id": user_id, ":deck_id": dialogue_id, ":deck_kind": DeckKind::Dialogue},
    )?;

    if let Some(ref mut i) = dialogue {
        i.notes = notes_db::notes_for_deck(conn, dialogue_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, dialogue_id)?;
        i.messages = get_original_chat_messages(&conn, user_id, dialogue_id)?;
        decks::hit(&conn, dialogue_id)?;
    }

    Ok(dialogue)
}

fn get_original_chat_messages(
    conn: &rusqlite::Connection,
    user_id: Key,
    dialogue_id: Key,
) -> Result<Vec<openai_interface::ChatMessage>, DbError> {
    let stmt = "SELECT msg.note_id as note_id, msg.role as role, msg.content as content
                FROM dialogue_messages AS msg
                     LEFT JOIN notes ON notes.id = msg.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE decks.user_id = :user_id AND decks.id = :deck_id
                ORDER BY msg.note_id";

    sqlite::many(
        conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": dialogue_id},
    )
}

impl FromRow for DialogueExtra {
    fn from_row(row: &Row) -> rusqlite::Result<DialogueExtra> {
        Ok(DialogueExtra {
            ai_kind: row.get(1)?,
        })
    }
}

pub(crate) fn edit(
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
                           WHERE deck_id = :deck_id";

    let dialogue_extras: DialogueExtra =
        sqlite::one(&tx, sql_query, named_params! {":deck_id": dialogue_id})?;

    let mut dialogue: interop::Dialogue = (edited_deck, dialogue_extras).try_into()?;
    dialogue.messages = get_original_chat_messages(&tx, user_id, dialogue_id)?;

    tx.commit()?;

    dialogue.notes = notes_db::notes_for_deck(conn, dialogue_id)?;
    dialogue.arrivals = notes_db::arrivals_for_deck(conn, dialogue_id)?;

    Ok(dialogue)
}

pub(crate) fn create(
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
         VALUES (:deck_id, :ai_kind)
         RETURNING deck_id, ai_kind",
        named_params! {":deck_id": deck.id, ":ai_kind": proto_dialogue.ai_kind.to_string()},
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

    let mut dialogue: Dialogue = (deck, dialogue_extras).try_into()?;

    dialogue.notes = notes_db::notes_for_deck(conn, dialogue.id)?;
    dialogue.arrivals = notes_db::arrivals_for_deck(conn, dialogue.id)?;

    Ok(dialogue)
}

pub(crate) fn add_chat_message(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
    chat_message: openai_interface::AppendChatMessage,
) -> Result<Key, DbError> {
    let tx = conn.transaction()?;

    let id = create_chat_message(&tx, user_id, deck_id, chat_message)?;

    tx.commit()?;

    Ok(id)
}

fn create_chat_message(
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
             VALUES (:role, :content, :note_id)",
        named_params! {
            ":role": chat_message.role.to_string(),
            ":content": chat_message.content,
            ":note_id": new_note.id
        },
    )?;

    Ok(new_note.id)
}

pub(crate) fn get_chat_history(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<(interop::AiKind, Vec<openai_interface::ChatMessage>), DbError> {
    let stmt = "SELECT notes.id as note_id, dm.role as role, dm.content as content
                FROM dialogue_messages AS dm
                     LEFT JOIN notes ON notes.id = dm.note_id
                     LEFT JOIN decks ON decks.id = notes.deck_id
                WHERE
                      decks.user_id=:user_id AND decks.id = :deck_id
                ORDER BY dm.id";

    let messages: Vec<openai_interface::ChatMessage> = sqlite::many(
        &conn,
        stmt,
        named_params! {":user_id": user_id, ":deck_id": deck_id},
    )?;

    let stmt = "SELECT ai_kind FROM dialogue_extras WHERE deck_id = :deck_id";
    let ai_kind = sqlite::one(&conn, stmt, named_params! {":deck_id": deck_id})?;

    Ok((ai_kind, messages))
}
