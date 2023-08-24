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
use crate::db::memorise as memorise_db;
use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::handler::decks;
use crate::handler::PaginationQuery;
use crate::interop::articles as interop;
use crate::interop::decks::DeckKind;
use crate::interop::{IdParam, Key, ProtoDeck};
use crate::session;
use actix_web::web::{self, Data, Json, Path};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    proto_deck: Json<ProtoDeck>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("create");

    let user_id = session::user_id(&session)?;
    let proto_deck = proto_deck.into_inner();

    let article = db::get_or_create(&sqlite_pool, user_id, &proto_deck.title)?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn get_all(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;
    let articles = db::all(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(articles))
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
        DeckKind::Article,
    )
    .await
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let paginated_recent = db::recent(&sqlite_pool, user_id, query.offset, query.num_items)?;

    Ok(HttpResponse::Ok().json(paginated_recent))
}

pub async fn orphans(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let paginated_orphans = db::orphans(&sqlite_pool, user_id, query.offset, query.num_items)?;

    Ok(HttpResponse::Ok().json(paginated_orphans))
}

pub async fn rated(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<PaginationQuery>,
) -> crate::Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let paginated_rated = db::rated(&sqlite_pool, user_id, query.offset, query.num_items)?;

    Ok(HttpResponse::Ok().json(paginated_rated))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
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
) -> crate::Result<HttpResponse> {
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
) -> crate::Result<HttpResponse> {
    info!("delete");

    let user_id = session::user_id(&session)?;

    db::delete(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}

fn sqlite_augment(
    sqlite_pool: &Data<SqlitePool>,
    article: &mut interop::Article,
    article_id: Key,
) -> crate::Result<()> {
    article.notes = notes_db::for_deck(sqlite_pool, article_id)?;
    article.backnotes = decks_db::get_backnotes(sqlite_pool, article_id)?;
    article.backrefs = decks_db::get_backrefs(sqlite_pool, article_id)?;
    article.flashcards = memorise_db::all_flashcards_for_deck(sqlite_pool, article_id)?;

    Ok(())
}
