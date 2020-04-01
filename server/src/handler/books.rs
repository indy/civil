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
use crate::interop::IdParam;
use crate::persist::books as db;
use crate::persist::edges as edges_db;
use crate::persist::notes as notes_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    book: Json<interop::CreateBook>,
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

    let user_id = session::user_id(&session)?;

    let book_id = params.id;
    let mut book = db::get(&db_pool, user_id, book_id).await?;

    let notes = notes_db::all_notes_for(&db_pool, book_id, notes_db::NoteType::Note).await?;
    book.notes = Some(notes);

    let quotes = notes_db::all_notes_for(&db_pool, book_id, notes_db::NoteType::Quote).await?;
    book.quotes = Some(quotes);

    let tags_in_notes = edges_db::from_deck_id_via_notes_to_tags(&db_pool, book_id).await?;
    book.tags_in_notes = Some(tags_in_notes);

    let decks_in_notes = edges_db::from_deck_id_via_notes_to_decks(&db_pool, book_id).await?;
    book.decks_in_notes = Some(decks_in_notes);

    Ok(HttpResponse::Ok().json(book))
}

pub async fn edit(
    book: Json<interop::Book>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let book = book.into_inner();
    let user_id = session::user_id(&session)?;

    let book = db::edit(&db_pool, user_id, &book, params.id).await?;

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
