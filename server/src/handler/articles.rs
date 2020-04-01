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
use crate::interop::articles as interop;
use crate::interop::IdParam;
use crate::persist::articles as db;
use crate::persist::edges as edges_db;
use crate::persist::notes as notes_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create(
    article: Json<interop::CreateArticle>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create");

    let article = article.into_inner();
    let user_id = session::user_id(&session)?;

    let article = db::create(&db_pool, user_id, &article).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn get_all(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_all");

    let user_id = session::user_id(&session)?;

    let articles = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(articles))
}

pub async fn get(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get {:?}", params.id);

    let user_id = session::user_id(&session)?;

    let article_id = params.id;
    let mut article = db::get(&db_pool, user_id, article_id).await?;

    let notes = notes_db::all_notes_for(&db_pool, article_id, notes_db::NoteType::Note).await?;
    article.notes = Some(notes);

    let quotes = notes_db::all_notes_for(&db_pool, article_id, notes_db::NoteType::Quote).await?;
    article.quotes = Some(quotes);

    let tags_in_notes = edges_db::from_deck_id_via_notes_to_tags(&db_pool, article_id).await?;
    article.tags_in_notes = Some(tags_in_notes);

    let decks_in_notes = edges_db::from_deck_id_via_notes_to_decks(&db_pool, article_id).await?;
    article.decks_in_notes = Some(decks_in_notes);

    Ok(HttpResponse::Ok().json(article))
}

pub async fn edit(
    article: Json<interop::Article>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit");

    let article = article.into_inner();
    let user_id = session::user_id(&session)?;

    let article = db::edit(&db_pool, user_id, &article, params.id).await?;

    Ok(HttpResponse::Ok().json(article))
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
