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
use crate::db::decks as decks_db;
use crate::db::dialogues as db;
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::DeckKind;
use crate::interop::dialogues as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{self, Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn chat(
    dialogue: Json<interop::ProtoChat>,
    ai: Data<AI>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("chat");

    let user_id = session::user_id(&session)?;
    info!(user_id);

    let dialogue = dialogue.into_inner();

    let response = ai
        .chat(dialogue.ai_kind, dialogue.original_chat_messages)
        .await?;

    Ok(HttpResponse::Ok().json(response))
}

pub async fn create(
    proto_dialogue: Json<interop::ProtoDialogue>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create dialogue");

    let user_id = session::user_id(&session)?;
    let proto_dialogue = proto_dialogue.into_inner();

    let dialogue = db::create(&sqlite_pool, user_id, proto_dialogue)?;

    Ok(HttpResponse::Ok().json(dialogue))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;
    let dialogues = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(dialogues))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    decks::pagination(
        sqlite_pool,
        query,
        session::user_id(&session)?,
        DeckKind::Dialogue,
    )
    .await
}

pub async fn converse(
    sqlite_pool: Data<SqlitePool>,
    chat_message: Json<openai_interface::AppendChatMessage>,
    ai: Data<AI>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("converse {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;
    let chat_message = chat_message.into_inner();

    // save the user's chat message
    let mut prev_note_id = db::add_chat_message(&sqlite_pool, user_id, deck_id, chat_message)?;

    let (ai_kind, history) = db::get_chat_history(&sqlite_pool, user_id, deck_id)?;

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
) -> crate::Result<HttpResponse> {
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
) -> crate::Result<HttpResponse> {
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
) -> crate::Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}

fn sqlite_augment(
    sqlite_pool: &Data<SqlitePool>,
    dialogue: &mut interop::Dialogue,
    dialogue_id: Key,
) -> crate::Result<()> {
    dialogue.notes = notes_db::all_from_deck(sqlite_pool, dialogue_id)?;
    dialogue.refs = decks_db::from_deck_id_via_notes_to_decks(sqlite_pool, dialogue_id)?;
    dialogue.backnotes = decks_db::get_backnotes(sqlite_pool, dialogue_id)?;
    dialogue.backrefs = decks_db::get_backrefs(sqlite_pool, dialogue_id)?;
    dialogue.flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, dialogue_id)?;

    Ok(())
}
