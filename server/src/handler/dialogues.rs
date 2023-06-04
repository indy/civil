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

use crate::db::decks as decks_db;
use crate::db::dialogues as db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::db::sr as sr_db;
use crate::error::Result;
use crate::interop::dialogues as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

use chatgpt::prelude::*;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatGPTResponse {
    pub response: Vec<MessageChoice>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageChoice {
    /// The actual message
    pub message: chatgpt::types::ChatMessage,
    /// The reason completion was stopped
    pub finish_reason: String,
    /// The index of this message in the outer `message_choices` array
    pub index: u32,
}

impl From<chatgpt::types::MessageChoice> for MessageChoice {
    fn from(mc: chatgpt::types::MessageChoice) -> MessageChoice {
        MessageChoice {
            message: mc.message,
            finish_reason: mc.finish_reason,
            index: mc.index,
        }
    }
}

impl From<interop::Role> for chatgpt::types::Role {
    fn from(r: interop::Role) -> chatgpt::types::Role {
        match r {
            interop::Role::System => chatgpt::types::Role::System,
            interop::Role::Assistant => chatgpt::types::Role::Assistant,
            interop::Role::User => chatgpt::types::Role::User,
        }
    }
}

impl From<interop::ChatMessage> for chatgpt::types::ChatMessage {
    fn from(dcm: interop::ChatMessage) -> chatgpt::types::ChatMessage {
        chatgpt::types::ChatMessage {
            role: dcm.role.into(),
            content: dcm.content,
        }
    }
}

pub async fn chat(
    dialogue: Json<interop::ProtoChat>,
    chatgpt_client: Data<ChatGPT>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("chat");

    let user_id = session::user_id(&session)?;
    info!(user_id);

    let dialogue = dialogue.into_inner();

    let mut history: Vec<chatgpt::types::ChatMessage> = vec![];
    for m in dialogue.messages {
        history.push(m.into());
    }

    let r = chatgpt_client.send_history(&history).await?;

    let mut response: Vec<MessageChoice> = vec![];
    for message_choice in r.message_choices {
        response.push(MessageChoice::from(message_choice));
    }

    let res = ChatGPTResponse { response };

    Ok(HttpResponse::Ok().json(res))
}

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let dialogue = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(dialogue))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;
    let dialogues = db::all(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(dialogues))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let dialogue_id = params.id;

    let mut dialogue = db::get(&sqlite_pool, user_id, dialogue_id)?;

    sqlite_augment(&sqlite_pool, &mut dialogue, dialogue_id)?;

    Ok(HttpResponse::Ok().json(dialogue))
}

pub async fn edit(
    dialogue: Json<interop::ProtoDialogue>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let dialogue_id = params.id;
    let dialogue = dialogue.into_inner();

    let mut dialogue = db::edit(&sqlite_pool, user_id, &dialogue, dialogue_id)?;
    sqlite_augment(&sqlite_pool, &mut dialogue, dialogue_id)?;

    Ok(HttpResponse::Ok().json(dialogue))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}

fn sqlite_augment(
    sqlite_pool: &Data<SqlitePool>,
    dialogue: &mut interop::Dialogue,
    dialogue_id: Key,
) -> Result<()> {
    let notes = notes_db::all_from_deck(sqlite_pool, dialogue_id)?;
    let refs = decks_db::from_deck_id_via_notes_to_decks(sqlite_pool, dialogue_id)?;
    let backnotes = decks_db::get_backnotes(sqlite_pool, dialogue_id)?;
    let backrefs = decks_db::get_backrefs(sqlite_pool, dialogue_id)?;
    let flashcards = sr_db::all_flashcards_for_deck(sqlite_pool, dialogue_id)?;

    dialogue.notes = Some(notes);
    dialogue.refs = Some(refs);
    dialogue.backnotes = Some(backnotes);
    dialogue.backrefs = Some(backrefs);
    dialogue.flashcards = Some(flashcards);

    Ok(())
}
