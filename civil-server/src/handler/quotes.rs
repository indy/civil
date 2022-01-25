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
use crate::handler::SearchQuery;
use crate::interop::decks::ResultList;
use crate::interop::quotes as interop;
use crate::interop::{IdParam, Key};
use crate::session;
use actix_web::web::{self, Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_quote: Json<interop::ProtoQuote>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_quote = proto_quote.into_inner();

    let quote = db::get_or_create(&db_pool, user_id, &proto_quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn search(
    db_pool: Data<Pool>,
    session: actix_session::Session,
    web::Query(query): web::Query<SearchQuery>,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;
    let results = db::search(&db_pool, user_id, &query.q).await?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
}

pub async fn random(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("random");

    let user_id = session::user_id(&session)?;

    let mut quote = db::random(&db_pool, user_id).await?;
    augment(&db_pool, &mut quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::get(&db_pool, user_id, params.id).await?;
    augment(&db_pool, &mut quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn next(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("next {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::next(&db_pool, user_id, params.id).await?;
    augment(&db_pool, &mut quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn prev(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("prev {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let mut quote = db::prev(&db_pool, user_id, params.id).await?;
    augment(&db_pool, &mut quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn edit(
    quote: Json<interop::ProtoQuote>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let quote_id = params.id;
    let quote = quote.into_inner();

    let mut quote = db::edit(&db_pool, user_id, &quote, quote_id).await?;
    augment(&db_pool, &mut quote).await?;

    Ok(HttpResponse::Ok().json(quote))
}

pub async fn delete(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, user_id, params.id).await?;

    Ok(HttpResponse::Ok().json(true))
}

async fn augment(db_pool: &Data<Pool>, quote: &mut interop::Quote) -> Result<()> {
    let quote_id: Key = quote.id;

    let (notes, refs, backnotes, backrefs, flashcards) = tokio::try_join!(
        notes_db::all_from_deck(&db_pool, quote_id),
        decks_db::from_deck_id_via_notes_to_decks(&db_pool, quote_id),
        decks_db::backnotes(&db_pool, quote_id),
        decks_db::backrefs(&db_pool, quote_id),
        sr_db::all_flashcards_for_deck(&db_pool, quote_id),
    )?;

    quote.notes = Some(notes);
    quote.refs = Some(refs);
    quote.backnotes = Some(backnotes);
    quote.backrefs = Some(backrefs);
    quote.flashcards = Some(flashcards);

    Ok(())
}
