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

use crate::interop::articles as interop;
use crate::error::Result;
use crate::interop::IdParam;
use crate::interop::Model;
use crate::persist::articles as db;
use crate::persist::decks as decks_db;
use crate::persist::notes as notes_db;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create_article(
    article: Json<interop::CreateArticle>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_article");

    let article = article.into_inner();
    let user_id = session::user_id(&session)?;

    let article = db::create(&db_pool, &article, user_id).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn get_articles(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_articles");
    let user_id = session::user_id(&session)?;
    // db statement
    let articles = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(articles))
}

pub async fn get_article(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_article {:?}", params.id);
    let user_id = session::user_id(&session)?;

    // db statements
    let article_id = params.id;
    let mut article = db::get(&db_pool, article_id, user_id).await?;

    let notes = notes_db::all_notes_for(&db_pool, article_id, notes_db::NoteType::Note).await?;
    article.notes = Some(notes);

    let quotes = notes_db::all_notes_for(&db_pool, article_id, notes_db::NoteType::Quote).await?;
    article.quotes = Some(quotes);

    let people_referenced =
        decks_db::referenced_in(&db_pool, Model::Article, article_id, Model::HistoricPerson)
            .await?;
    article.people_referenced = Some(people_referenced);

    let subjects_referenced =
        decks_db::referenced_in(&db_pool, Model::Article, article_id, Model::Subject).await?;
    article.subjects_referenced = Some(subjects_referenced);

    Ok(HttpResponse::Ok().json(article))
}

pub async fn edit_article(
    article: Json<interop::Article>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let article = article.into_inner();
    let user_id = session::user_id(&session)?;

    let article = db::edit(&db_pool, &article, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn delete_article(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}
