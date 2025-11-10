// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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

use crate::ai::{AI, openai_interface};
use crate::db::dialogues as db;
use crate::db::{SqlitePool, db_thread};
use crate::handler::{AuthUser, PaginationQuery, decks};
use crate::interop::IdParam;
use crate::interop::decks::DeckKind;
use crate::interop::dialogues as interop;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path, Query};

pub async fn chat(
    Json(dialogue): Json<interop::ProtoChat>,
    ai: Data<AI>,
    AuthUser(_user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let response = ai.chat(dialogue.ai_kind, dialogue.messages).await?;

    Ok(Json(response))
}

pub async fn create(
    Json(proto_dialogue): Json<interop::ProtoDialogue>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogue = db_thread(&sqlite_pool, move |conn| {
        db::create(conn, user_id, proto_dialogue)
    })
    .await?;

    Ok(Json(dialogue))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogues = db_thread(&sqlite_pool, move |conn| db::all(conn, user_id)).await?;

    Ok(Json(dialogues))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<impl Responder> {
    decks::pagination(sqlite_pool, query, user_id, DeckKind::Dialogue).await
}

pub async fn converse(
    sqlite_pool: Data<SqlitePool>,
    chat_message: Json<openai_interface::AppendChatMessage>,
    ai: Data<AI>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let chat_message = chat_message.into_inner();

    // save the user's chat message
    let deck_id = params.id;
    let mut prev_note_id = db_thread(&sqlite_pool, move |conn| {
        db::add_chat_message(conn, user_id, deck_id, chat_message)
    })
    .await?;

    let (ai_kind, history) = db_thread(&sqlite_pool, move |conn| {
        db::get_chat_history(conn, user_id, deck_id)
    })
    .await?;

    let response = ai.chat(ai_kind, history).await?;

    for message_choice in response {
        // should only loop through once
        //
        let message = message_choice.message;
        let acm = openai_interface::AppendChatMessage {
            prev_note_id: Some(prev_note_id),
            role: openai_interface::Role::from(message.role),
            content: message.content,
        };
        prev_note_id = db_thread(&sqlite_pool, move |conn| {
            db::add_chat_message(conn, user_id, deck_id, acm)
        })
        .await?;
    }

    let dialogue = db_thread(&sqlite_pool, move |conn| db::get(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(dialogue))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogue = db_thread(&sqlite_pool, move |conn| db::get(conn, user_id, params.id))
        .await?
        .ok_or(crate::Error::NotFound)?;

    Ok(Json(dialogue))
}

pub async fn edit(
    Json(dialogue): Json<interop::ProtoDialogue>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogue = db_thread(&sqlite_pool, move |conn| {
        db::edit(conn, user_id, dialogue, params.id)
    })
    .await?;

    Ok(Json(dialogue))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    decks::delete(sqlite_pool, user_id, params.id).await
}
