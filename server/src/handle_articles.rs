// Copyright (C) 2020 Inderjit Gill <email@indy.io>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::error::Result;
use crate::handle_historic_people;
use crate::handle_notes;
use crate::handle_subjects;
use crate::model::Model;
use crate::note_type::NoteType;
//use crate::session;
use crate::types::Key;
use crate::web_common;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use tracing::info;

pub mod web {
    use crate::handle_historic_people::web::PersonReference;
    use crate::handle_notes::web::Note;
    use crate::handle_subjects::web::SubjectReference;
    use crate::types::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Article {
        pub id: Key,
        pub title: String,
        pub source: Option<String>,

        pub notes: Option<Vec<Note>>,
        pub quotes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<PersonReference>>,
        pub subjects_referenced: Option<Vec<SubjectReference>>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct ArticleMention {
        pub article_id: Key,
        pub article_title: String,
    }

    impl From<&super::db::ArticleMention> for ArticleMention {
        fn from(sm: &super::db::ArticleMention) -> ArticleMention {
            ArticleMention {
                article_id: sm.article_id,
                article_title: sm.article_title.to_string(),
            }
        }
    }
}

pub async fn create_article(
    article: Json<web::Article>,
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_article");

    let article = article.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let db_article = db::create_article(&db_pool, &article, user_id).await?;

    Ok(HttpResponse::Ok().json(web::Article::from(db_article)))
}

pub async fn get_articles(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_articles");
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;
    // db statement
    let db_articles: Vec<db::Article> = db::get_articles(&db_pool, user_id).await?;

    let articles: Vec<web::Article> = db_articles
        .into_iter()
        .map(|db_article| web::Article::from(db_article))
        .collect();

    Ok(HttpResponse::Ok().json(articles))
}

pub async fn get_article(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_article {:?}", params.id);
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // db statements
    let article_id = params.id;
    let db_article: db::Article = db::get_article(&db_pool, article_id, user_id).await?;
    let mut article = web::Article::from(db_article);

    let db_notes =
        handle_notes::db::all_notes_for(&db_pool, Model::Article, article_id, NoteType::Note)
            .await?;
    let notes = db_notes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    article.notes = Some(notes);

    let db_quotes =
        handle_notes::db::all_notes_for(&db_pool, Model::Article, article_id, NoteType::Quote)
            .await?;
    let quotes = db_quotes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    article.quotes = Some(quotes);

    let db_people_referenced =
        handle_historic_people::db::get_people_referenced(&db_pool, Model::Article, article_id)
            .await?;
    let people_referenced = db_people_referenced
        .iter()
        .map(|p| handle_historic_people::web::PersonReference::from(p))
        .collect();
    article.people_referenced = Some(people_referenced);

    let db_subjects_referenced =
        handle_subjects::db::get_subjects_referenced(&db_pool, Model::Article, article_id).await?;
    let subjects_referenced = db_subjects_referenced
        .iter()
        .map(|p| handle_subjects::web::SubjectReference::from(p))
        .collect();
    article.subjects_referenced = Some(subjects_referenced);

    Ok(HttpResponse::Ok().json(article))
}

pub async fn edit_article(
    article: Json<web::Article>,
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let article = article.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let db_article = db::edit_article(&db_pool, &article, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(web::Article::from(db_article)))
}

pub async fn delete_article(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    db::delete_article(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::web;
    use crate::edge_type::{self, EdgeType};
    use crate::error::Result;
    use crate::handle_edges;
    use crate::handle_notes;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use crate::types::Key;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "articles")]
    pub struct Article {
        pub id: Key,
        pub title: String,
        pub source: Option<String>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "articles")]
    pub struct ArticleMention {
        pub article_id: Key,
        pub article_title: String,
    }

    // todo: should this from impl be in web???
    impl From<Article> for web::Article {
        fn from(a: Article) -> web::Article {
            web::Article {
                id: a.id,
                title: a.title,
                source: a.source,

                notes: None,
                quotes: None,

                people_referenced: None,
                subjects_referenced: None,
            }
        }
    }

    pub async fn get_articles(db_pool: &Pool, user_id: Key) -> Result<Vec<Article>> {
        let res =
            pg::many::<Article>(db_pool, include_str!("sql/articles_all.sql"), &[&user_id]).await?;

        Ok(res)
    }

    pub async fn get_article(db_pool: &Pool, article_id: Key, user_id: Key) -> Result<Article> {
        let article = pg::one::<Article>(
            db_pool,
            include_str!("sql/articles_get.sql"),
            &[&article_id, &user_id],
        )
        .await?;

        Ok(article)
    }

    pub async fn create_article(
        db_pool: &Pool,
        article: &web::Article,
        user_id: Key,
    ) -> Result<Article> {
        let res = pg::one::<Article>(
            db_pool,
            include_str!("sql/articles_create.sql"),
            &[&user_id, &article.title, &article.source],
        )
        .await?;

        Ok(res)
    }

    pub async fn edit_article(
        db_pool: &Pool,
        article: &web::Article,
        article_id: Key,
        user_id: Key,
    ) -> Result<Article> {
        let res = pg::one::<Article>(
            db_pool,
            include_str!("sql/articles_edit.sql"),
            &[&article_id, &user_id, &article.title, &article.source],
        )
        .await?;

        Ok(res)
    }

    pub async fn delete_article(db_pool: &Pool, article_id: Key, user_id: Key) -> Result<()> {
        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&db_pool, Model::Article, article_id).await?;
        handle_edges::db::delete_all_edges_for(&db_pool, Model::Article, article_id).await?;

        pg::delete_owned::<Article>(db_pool, article_id, user_id, Model::Article).await?;

        Ok(())
    }

    pub async fn articles_that_mention(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<ArticleMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/articles_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<ArticleMention>(db_pool, &stmt, &[&id, &e1, &EdgeType::ArticleToNote])
            .await?;

        Ok(res)
    }
}
