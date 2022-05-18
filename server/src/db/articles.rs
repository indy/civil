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

use super::pg;
use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::error::{Error, Result};
use crate::interop::articles as interop;
use crate::interop::decks as interop_decks;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Article {
    id: Key,
    name: String,
    source: Option<String>,
    author: Option<String>,
    short_description: Option<String>,
    rating: i32,
    created_at: chrono::DateTime<chrono::Utc>,
    published_date: Option<chrono::NaiveDate>,
}

impl From<Article> for interop::Article {
    fn from(a: Article) -> interop::Article {
        interop::Article {
            id: a.id,
            title: a.name,

            created_at: a.created_at,

            source: a.source,
            author: a.author,
            short_description: a.short_description,

            rating: a.rating,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,

            published_date: a.published_date,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "article_extras")]
struct ArticleExtra {
    deck_id: Key,
    source: Option<String>,
    author: Option<String>,
    short_description: Option<String>,
    rating: i32,
    published_date: Option<chrono::NaiveDate>,
}

impl From<(decks::DeckBase, ArticleExtra)> for interop::Article {
    fn from(a: (decks::DeckBase, ArticleExtra)) -> interop::Article {
        let (deck, extra) = a;
        interop::Article {
            id: deck.id,
            title: deck.name,

            created_at: deck.created_at,

            source: extra.source,
            author: extra.author,
            short_description: extra.short_description,

            rating: extra.rating,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,

            published_date: extra.published_date,
        }
    }
}

pub(crate) async fn search(
    db_pool: &Pool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop_decks::DeckSimple>> {
    decks::search_within_deck_kind_by_name(db_pool, user_id, DeckKind::Article, query).await
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Article>> {
    pg::many_from::<Article, interop::Article>(
        db_pool,
        "SELECT decks.id, decks.name, article_extras.source, article_extras.author, article_extras.short_description, coalesce(article_extras.rating, 0) as rating, decks.created_at, article_extras.published_date
         FROM decks left join article_extras on article_extras.deck_id = decks.id
         WHERE user_id = $1 and kind = 'article'
         ORDER BY created_at desc",
        &[&user_id],
    )
    .await
}

pub(crate) async fn listings(db_pool: &Pool, user_id: Key) -> Result<interop::ArticleListings> {
    async fn many_from(db_pool: &Pool, user_id: Key, query: &str) -> Result<Vec<interop::Article>> {
        pg::many_from::<Article, interop::Article>(db_pool, query, &[&user_id]).await
    }

    let (recent, rated, orphans) = tokio::try_join!(
        many_from(
            db_pool,
            user_id,
            "SELECT decks.id, decks.name, article_extras.source, article_extras.author, article_extras.short_description, coalesce(article_extras.rating, 0) as rating, decks.created_at, article_extras.published_date
             FROM decks left join article_extras on article_extras.deck_id = decks.id
             WHERE user_id = $1 and kind = 'article'
             ORDER BY created_at desc
             LIMIT 10",
        ),
        many_from(
            db_pool,
            user_id,
            "SELECT decks.id, decks.name, article_extras.source, article_extras.author, article_extras.short_description, coalesce(article_extras.rating, 0) as rating, decks.created_at, article_extras.published_date
             FROM decks left join article_extras on article_extras.deck_id = decks.id
             WHERE user_id = $1 and kind = 'article' and article_extras.rating > 0
             ORDER BY article_extras.rating desc",
        ),
        many_from(
            db_pool,
            user_id,
            "SELECT d.id, d.name, pe.source, pe.author, pe.short_description, coalesce(pe.rating, 0) as rating, d.created_at, pe.published_date
             FROM decks d left join article_extras pe on pe.deck_id=d.id
             WHERE d.id not in (SELECT deck_id
                                FROM notes_decks
                                GROUP BY deck_id)
             AND d.id not in (SELECT n.deck_id
                              FROM notes n inner join notes_decks nd on n.id = nd.note_id
                              GROUP by n.deck_id)
             AND d.kind = 'article'
             AND d.user_id = $1
             ORDER BY d.created_at desc",
        ),
    )?;

    Ok(interop::ArticleListings {
        recent,
        rated,
        orphans,
    })
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, article_id: Key) -> Result<interop::Article> {
    pg::one_from::<Article, interop::Article>(
        db_pool,
        "SELECT decks.id, decks.name, article_extras.source, article_extras.author, article_extras.short_description, coalesce(article_extras.rating, 0) as rating, decks.created_at, article_extras.published_date
         FROM decks left join article_extras on article_extras.deck_id = decks.id
         WHERE user_id = $1 and id = $2 and kind = 'article'",
        &[&user_id, &article_id],
    )
    .await
}

pub(crate) async fn get_or_create(
    db_pool: &Pool,
    user_id: Key,
    title: &str,
) -> Result<interop::Article> {
    let source = "";
    let author = "";
    let short_description = "";
    let rating = 0;
    let published_date = chrono::Utc::now().naive_utc().date();

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;

    let tx = client.transaction().await?;

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Article, &title).await?;

    let article_extras =
        match origin {
            decks::DeckBaseOrigin::Created => pg::one::<ArticleExtra>(
                &tx,
                "INSERT INTO article_extras(deck_id, source, author, short_description, rating, published_date)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING $table_fields",
                &[&deck.id, &source, &author, &short_description, &rating, &published_date],
            )
            .await?,
            decks::DeckBaseOrigin::PreExisting => {
                pg::one::<ArticleExtra>(
                    &tx,
                    "select deck_id, source, author, short_description, rating, published_date
                 from article_extras
                 where deck_id=$1",
                    &[&deck.id],
                )
                .await?
            }
        };

    tx.commit().await?;

    Ok((deck, article_extras).into())
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    article: &interop::ProtoArticle,
    article_id: Key,
) -> Result<interop::Article> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        article_id,
        DeckKind::Article,
        &article.title,
        graph_terminator,
    )
    .await?;

    let article_extras_exists = pg::many::<ArticleExtra>(
        &tx,
        "select deck_id, source, author, short_description, rating, published_date
         from article_extras
         where deck_id=$1",
        &[&article_id],
    )
    .await?;

    let sql_query: &str = match article_extras_exists.len() {
        0 => {
            "INSERT INTO article_extras(deck_id, source, author, short_description, rating, published_date)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING $table_fields"
        }
        1 => {
            "UPDATE article_extras
              SET source = $2, author = $3, short_description = $4, rating = $5, published_date = $6
              WHERE deck_id = $1
              RETURNING $table_fields"
        }
        _ => {
            // should be impossible to get here since deck_id
            // is a primary key in the article_extras table
            error!(
                "multiple article_extras entries for article: {}",
                &article_id
            );
            return Err(Error::TooManyFound);
        }
    };

    let article_extras = pg::one::<ArticleExtra>(
        &tx,
        sql_query,
        &[
            &article_id,
            &article.source,
            &article.author,
            &article.short_description,
            &article.rating,
            &article.published_date,
        ],
    )
    .await?;

    tx.commit().await?;

    Ok((edited_deck, article_extras).into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, article_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, article_id).await
}
