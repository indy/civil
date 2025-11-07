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

use crate::db::quotes as db;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::decks::DeckKind;
use crate::interop::quotes as interop;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::HttpResponse;

use crate::db::SqlitePool;

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

    let quote = db::get_or_create(&sqlite_pool, user_id, proto_quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn random(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("random");

    let user_id = session::user_id(&session)?;

    let quote = match db::random(sqlite_pool.get_ref(), user_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

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
    let quote_id = params.id;

    let quote = match db::get(sqlite_pool.get_ref(), user_id, quote_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn next(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("next {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let quote_id = params.id;

    let quote = match db::next(sqlite_pool.get_ref(), user_id, quote_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn prev(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("prev {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let quote_id = params.id;

    let quote = match db::prev(sqlite_pool.get_ref(), user_id, quote_id).await? {
        Some(i) => i,
        None => return Err(crate::Error::NotFound),
    };

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

    let quote = db::edit(&sqlite_pool, user_id, quote, quote_id).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&sqlite_pool, user_id, params.id).await?;

    Ok(HttpResponse::Ok().json(true))
}
