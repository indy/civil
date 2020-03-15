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
use crate::handle_historic_people;
use crate::handle_notes;
use crate::handle_subjects;
use crate::interop::IdParam;
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use tracing::info;

pub mod interop {
    use crate::handle_historic_people::interop::PersonReference;
    use crate::handle_notes::interop::Note;
    use crate::handle_subjects::interop::SubjectReference;
    use crate::interop::Key;

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
    pub struct CreateArticle {
        pub title: String,
        pub source: Option<String>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct ArticleMention {
        pub article_id: Key,
        pub article_title: String,
    }
}

pub async fn create_article(
    article: Json<interop::CreateArticle>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_article");

    let article = article.into_inner();
    let user_id = session::user_id(&session)?;

    let article = db::create_article(&db_pool, &article, user_id).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn get_articles(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_articles");
    let user_id = session::user_id(&session)?;
    // db statement
    let articles = db::get_articles(&db_pool, user_id).await?;

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
    let mut article = db::get_article(&db_pool, article_id, user_id).await?;

    let notes =
        handle_notes::db::all_notes_for(&db_pool, Model::Article, article_id, NoteType::Note)
            .await?;
    article.notes = Some(notes);

    let quotes =
        handle_notes::db::all_notes_for(&db_pool, Model::Article, article_id, NoteType::Quote)
            .await?;
    article.quotes = Some(quotes);

    let people_referenced =
        handle_historic_people::db::get_people_referenced(&db_pool, Model::Article, article_id)
            .await?;
    article.people_referenced = Some(people_referenced);

    let subjects_referenced =
        handle_subjects::db::get_subjects_referenced(&db_pool, Model::Article, article_id).await?;
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

    let article = db::edit_article(&db_pool, &article, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(article))
}

pub async fn delete_article(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_article(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::edge_type::{self, EdgeType};
    use crate::error::{Error, Result};
    use crate::handle_edges;
    use crate::handle_notes;
    use crate::interop::Key;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use deadpool_postgres::{Client, Pool};
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "articles")]
    struct Article {
        id: Key,
        title: String,
        source: Option<String>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "articles")]
    struct ArticleMention {
        article_id: Key,
        article_title: String,
    }

    // todo: should this from impl be in interop???
    impl From<Article> for interop::Article {
        fn from(a: Article) -> interop::Article {
            interop::Article {
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

    impl From<&ArticleMention> for interop::ArticleMention {
        fn from(sm: &ArticleMention) -> interop::ArticleMention {
            interop::ArticleMention {
                article_id: sm.article_id,
                article_title: sm.article_title.to_string(),
            }
        }
    }

    pub async fn get_articles(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Article>> {
        let db_articles = pg::many_non_transactional::<Article>(
            db_pool,
            include_str!("sql/articles_all.sql"),
            &[&user_id],
        )
        .await?;

        let articles: Vec<interop::Article> = db_articles
            .into_iter()
            .map(|db_article| interop::Article::from(db_article))
            .collect();

        Ok(articles)
    }

    pub async fn get_article(
        db_pool: &Pool,
        article_id: Key,
        user_id: Key,
    ) -> Result<interop::Article> {
        let db_article = pg::one_non_transactional::<Article>(
            db_pool,
            include_str!("sql/articles_get.sql"),
            &[&article_id, &user_id],
        )
        .await?;

        let article = interop::Article::from(db_article);

        Ok(article)
    }

    pub async fn create_article(
        db_pool: &Pool,
        article: &interop::CreateArticle,
        user_id: Key,
    ) -> Result<interop::Article> {
        let db_article = pg::one_non_transactional::<Article>(
            db_pool,
            include_str!("sql/articles_create.sql"),
            &[&user_id, &article.title, &article.source],
        )
        .await?;

        let article = interop::Article::from(db_article);

        Ok(article)
    }

    pub async fn edit_article(
        db_pool: &Pool,
        article: &interop::Article,
        article_id: Key,
        user_id: Key,
    ) -> Result<interop::Article> {
        let db_article = pg::one_non_transactional::<Article>(
            db_pool,
            include_str!("sql/articles_edit.sql"),
            &[&article_id, &user_id, &article.title, &article.source],
        )
        .await?;

        let article = interop::Article::from(db_article);

        Ok(article)
    }

    pub async fn delete_article(db_pool: &Pool, article_id: Key, user_id: Key) -> Result<()> {
        let mut client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;
        let tx = client.transaction().await?;

        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&tx, Model::Article, article_id).await?;
        handle_edges::db::delete_all_edges_for(&tx, Model::Article, article_id).await?;

        pg::delete_owned_by_user::<Article>(&tx, article_id, user_id, Model::Article).await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn articles_that_mention(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<interop::ArticleMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/articles_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let db_mentioned_in_articles = pg::many_non_transactional::<ArticleMention>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::ArticleToNote],
        )
        .await?;

        let mentioned_in_articles = db_mentioned_in_articles
            .iter()
            .map(|a| interop::ArticleMention::from(a))
            .collect();

        Ok(mentioned_in_articles)
    }
}
