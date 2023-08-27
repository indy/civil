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

use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::quotes as db;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::DeckKind;
use crate::interop::quotes as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::HttpResponse;

use crate::db::sqlite::SqlitePool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_quote: Json<interop::ProtoQuote>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_quote = proto_quote.into_inner();

    let quote = db::get_or_create(&sqlite_pool, user_id, &proto_quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn random(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("random");

    let user_id = session::user_id(&session)?;

    let mut quote = db::random(&sqlite_pool, user_id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    decks::pagination(
        sqlite_pool,
        query,
        session::user_id(&session)?,
        DeckKind::Quote,
    )
    .await
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::get(&sqlite_pool, user_id, params.id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn next(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("next {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::next(&sqlite_pool, user_id, params.id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn prev(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("prev {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::prev(&sqlite_pool, user_id, params.id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn edit(
    quote: Json<interop::ProtoQuote>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let quote_id = params.id;
    let quote = quote.into_inner();

    let mut quote = db::edit(&sqlite_pool, user_id, &quote, quote_id)?;
    sqlite_augment(&sqlite_pool, &mut quote)?;

    Ok(HttpResponse::Ok().json(quote))
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

fn sqlite_augment(sqlite_pool: &Data<SqlitePool>, quote: &mut interop::Quote) -> crate::Result<()> {
    let quote_id: Key = quote.id;

    quote.notes = notes_db::notes_for_deck(sqlite_pool, quote_id)?;
    quote.back_decks = notes_db::backdecks_for_deck(sqlite_pool, quote_id)?;
    quote.flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, quote_id)?;

    Ok(())
}
