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

use crate::db::decks as decks_db;
use crate::db::events as db;
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::interop::events as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

use crate::db::sqlite::SqlitePool;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let event = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(event))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let events = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(events))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let event_id = params.id;

    let mut event = db::get(&sqlite_pool, user_id, event_id)?;
    sqlite_augment(&sqlite_pool, &mut event, event_id)?;

    Ok(HttpResponse::Ok().json(event))
}

pub async fn edit(
    event: Json<interop::ProtoEvent>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let event_id = params.id;
    let event = event.into_inner();

    let mut event = db::edit(&sqlite_pool, user_id, &event, event_id)?;
    sqlite_augment(&sqlite_pool, &mut event, event_id)?;

    Ok(HttpResponse::Ok().json(event))
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
    event: &mut interop::Event,
    event_id: Key,
) -> crate::Result<()> {
    let notes = notes_db::all_from_deck(sqlite_pool, event_id)?;
    let refs = decks_db::from_deck_id_via_notes_to_decks(sqlite_pool, event_id)?;
    let backnotes = decks_db::get_backnotes(sqlite_pool, event_id)?;
    let backrefs = decks_db::get_backrefs(sqlite_pool, event_id)?;
    let flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, event_id)?;

    event.notes = Some(notes);
    event.refs = Some(refs);
    event.backnotes = Some(backnotes);
    event.backrefs = Some(backrefs);
    event.flashcards = Some(flashcards);

    Ok(())
}
