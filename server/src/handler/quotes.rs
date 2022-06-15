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
use crate::db::notes as notes_db;
use crate::db::quotes as db;
use crate::db::sr as sr_db;
use crate::error::Result;
use crate::interop::quotes as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

use crate::db::sqlite::SqlitePool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_quote: Json<interop::ProtoQuote>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_quote = proto_quote.into_inner();

    let quote = db::sqlite_get_or_create(&sqlite_pool, user_id, &proto_quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn random(sqlite_pool: Data<SqlitePool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("random");

    let user_id = session::user_id(&session)?;

    let mut quote = db::sqlite_random(&sqlite_pool, user_id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::sqlite_get(&sqlite_pool, user_id, params.id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn next(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("next {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::sqlite_next(&sqlite_pool, user_id, params.id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn prev(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("prev {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::sqlite_prev(&sqlite_pool, user_id, params.id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn edit(
    quote: Json<interop::ProtoQuote>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let quote_id = params.id;
    let quote = quote.into_inner();

    let mut quote = db::sqlite_edit(&sqlite_pool, user_id, &quote, quote_id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::sqlite_delete(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}

fn sqlite_augment(sqlite_pool: &Data<SqlitePool>, quote: &mut interop::SqliteQuote) -> Result<()> {
    let quote_id: Key = quote.id;

    let notes = notes_db::sqlite_all_from_deck(&sqlite_pool, quote_id)?;
    let refs = decks_db::sqlite_from_deck_id_via_notes_to_decks(&sqlite_pool, quote_id)?;
    let backnotes = decks_db::sqlite_get_backnotes(&sqlite_pool, quote_id)?;
    let backrefs = decks_db::sqlite_get_backrefs(&sqlite_pool, quote_id)?;
    let flashcards = sr_db::sqlite_all_flashcards_for_deck(&sqlite_pool, quote_id)?;

    quote.notes = Some(notes);
    quote.refs = Some(refs);
    quote.backnotes = Some(backnotes);
    quote.backrefs = Some(backrefs);
    quote.flashcards = Some(flashcards);

    Ok(())
}
