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
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::error::Result;
use crate::external::openai;
use crate::interop::dialogues as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn chat(
    dialogue: Json<interop::ProtoChat>,
    chatgpt_client: Data<chatgpt::prelude::ChatGPT>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("chat");

    let user_id = session::user_id(&session)?;
    info!(user_id);

    let dialogue = dialogue.into_inner();

    let response = openai::chat(chatgpt_client, dialogue.messages).await?;

    Ok(HttpResponse::Ok().json(response))
}

pub async fn create(
    proto_dialogue: Json<interop::ProtoDialogue>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create dialogue");

    let user_id = session::user_id(&session)?;
    let proto_dialogue = proto_dialogue.into_inner();

    let dialogue = db::create(&sqlite_pool, user_id, proto_dialogue)?;

    Ok(HttpResponse::Ok().json(dialogue))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;
    let dialogues = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(dialogues))
}

pub async fn converse(
    sqlite_pool: Data<SqlitePool>,
    chat_message: Json<interop::AppendChatMessage>,
    chatgpt_client: Data<chatgpt::prelude::ChatGPT>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("converse {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;
    let chat_message = chat_message.into_inner();

    // save the user's chat message
    let mut prev_note_id = db::add_chat_message(&sqlite_pool, user_id, deck_id, chat_message)?;

    let history = db::get_chat_history(&sqlite_pool, user_id, deck_id)?;

    let response = openai::chat(chatgpt_client, history).await?;

    for message_choice in response {
        // should only loop through once
        //
        let message = message_choice.message;
        let acm = interop::AppendChatMessage {
            prev_note_id: Some(prev_note_id),
            role: interop::Role::from(message.role),
            content: message.content,
        };
        prev_note_id = db::add_chat_message(&sqlite_pool, user_id, deck_id, acm)?;
    }

    let mut dialogue = db::get(&sqlite_pool, user_id, deck_id)?;
    sqlite_augment(&sqlite_pool, &mut dialogue, deck_id)?;

    Ok(HttpResponse::Ok().json(dialogue))
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
    let flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, dialogue_id)?;

    dialogue.notes = Some(notes);
    dialogue.refs = Some(refs);
    dialogue.backnotes = Some(backnotes);
    dialogue.backrefs = Some(backrefs);
    dialogue.flashcards = Some(flashcards);

    Ok(())
}
