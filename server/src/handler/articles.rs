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

use crate::db::articles as db;
use crate::db::decks as decks_db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::db::sr as sr_db;
use crate::error::Result;
use crate::interop::articles as interop;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let article = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;
    let articles = db::all(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(articles))
}

pub async fn get_listings(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_listings");

    let user_id = session::user_id(&session)?;
    let articles = db::listings(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(articles))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let article_id = params.id;

    let mut article = db::get(&sqlite_pool, user_id, article_id)?;

    sqlite_augment(&sqlite_pool, &mut article, article_id)?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn edit(
    article: Json<interop::ProtoArticle>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let user_id = session::user_id(&session)?;
    let article_id = params.id;
    let article = article.into_inner();

    let mut article = db::edit(&sqlite_pool, user_id, &article, article_id)?;
    sqlite_augment(&sqlite_pool, &mut article, article_id)?;

    Ok(HttpResponse::Ok().json(article))
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
    article: &mut interop::Article,
    article_id: Key,
) -> Result<()> {
    let notes = notes_db::all_from_deck(&sqlite_pool, article_id)?;
    let refs = decks_db::from_deck_id_via_notes_to_decks(&sqlite_pool, article_id)?;
    let backnotes = decks_db::get_backnotes(&sqlite_pool, article_id)?;
    let backrefs = decks_db::get_backrefs(&sqlite_pool, article_id)?;
    let flashcards = sr_db::all_flashcards_for_deck(&sqlite_pool, article_id)?;

    article.notes = Some(notes);
    article.refs = Some(refs);
    article.backnotes = Some(backnotes);
    article.backrefs = Some(backrefs);
    article.flashcards = Some(flashcards);

    Ok(())
}
