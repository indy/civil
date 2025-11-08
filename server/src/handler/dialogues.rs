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

use crate::ai::{openai_interface, AI};
use crate::db::dialogues as db;
use crate::db::SqlitePool;
use crate::handler::{decks, AuthUser, PaginationQuery};
use crate::interop::decks::DeckKind;
use crate::interop::dialogues as interop;
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::Responder;

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
    let dialogue = db::create(&sqlite_pool, user_id, proto_dialogue).await?;

    Ok(Json(dialogue))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogues = db::listings(&sqlite_pool, user_id).await?;

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
    let mut prev_note_id =
        db::add_chat_message(&sqlite_pool, user_id, params.id, chat_message).await?;

    let (ai_kind, history) = db::get_chat_history(&sqlite_pool, user_id, params.id).await?;

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
        prev_note_id = db::add_chat_message(&sqlite_pool, user_id, params.id, acm).await?;
    }

    let dialogue = db::get(&sqlite_pool, user_id, params.id).await?;

    Ok(Json(dialogue))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogue = match db::get(&sqlite_pool, user_id, params.id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(Json(dialogue))
}

pub async fn edit(
    Json(dialogue): Json<interop::ProtoDialogue>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let dialogue = db::edit(&sqlite_pool, user_id, dialogue, params.id).await?;

    Ok(Json(dialogue))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    db::delete(&sqlite_pool, user_id, params.id).await?;

    Ok(Json(true))
}
