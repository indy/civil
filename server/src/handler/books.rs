// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

use crate::error::Result;
use crate::interop::books as interop;
use crate::interop::{IdParam, Key};
use crate::persist::books as db;
use crate::persist::decks as decks_db;
use crate::persist::notes as notes_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    book: Json<interop::ProtoBook>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let book = book.into_inner();
    let user_id = session::user_id(&session)?;

    let book = db::create(&db_pool, user_id, &book).await?;

    Ok(HttpResponse::Ok().json(book))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let books = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(books))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let book_id = params.id;
    let user_id = session::user_id(&session)?;

    let mut book = db::get(&db_pool, user_id, book_id).await?;
    augment(&db_pool, &mut book, book_id).await?;

    Ok(HttpResponse::Ok().json(book))
}

pub async fn edit(
    book: Json<interop::ProtoBook>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let book_id = params.id;
    let book = book.into_inner();

    let mut book = db::edit(&db_pool, user_id, &book, book_id).await?;
    augment(&db_pool, &mut book, book_id).await?;

    Ok(HttpResponse::Ok().json(book))
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

async fn augment(db_pool: &Data<Pool>, book: &mut interop::Book, book_id: Key) -> Result<()> {
    let (notes, decks_in_notes, linkbacks_to_decks) = tokio::try_join!(
        notes_db::all_from_deck(&db_pool, book_id),
        decks_db::from_deck_id_via_notes_to_decks(&db_pool, book_id),
        decks_db::from_decks_via_notes_to_deck_id(&db_pool, book_id),
    )?;

    book.notes = Some(notes);
    book.decks_in_notes = Some(decks_in_notes);
    book.linkbacks_to_decks = Some(linkbacks_to_decks);

    Ok(())
}
