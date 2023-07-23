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

use crate::db::decks;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::Error;
use crate::interop::articles as interop;
use crate::interop::decks::DeckKind;
use crate::interop::Key;
use rusqlite::{params, Row};

use tracing::error;

#[derive(Debug, Clone)]
struct ArticleExtra {
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
            title: deck.title,

            insignia: deck.insignia,
            typeface: deck.typeface,

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

fn from_row(row: &Row) -> crate::Result<interop::Article> {
    Ok(interop::Article {
        id: row.get(0)?,
        title: row.get(1)?,

        insignia: row.get(8)?,
        typeface: row.get(9)?,

        created_at: row.get(6)?,

        source: row.get(2)?,
        author: row.get(3)?,
        short_description: row.get(4)?,

        rating: row.get(5)?,

        notes: None,

        refs: None,

        backnotes: None,
        backrefs: None,

        flashcards: None,

        published_date: row.get(7)?,
    })
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<interop::Article>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, article_extras.source, article_extras.author,
                       article_extras.short_description, coalesce(article_extras.rating, 0) as rating,
                       decks.created_at, article_extras.published_date, decks.insignia, decks.typeface
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND kind = 'article'
                ORDER BY created_at DESC";
    sqlite::many(&conn, stmt, params![&user_id], from_row)
}

pub(crate) fn listings(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<interop::ArticleListings> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, article_extras.source, article_extras.author,
                       article_extras.short_description, coalesce(article_extras.rating, 0) as rating,
                       decks.created_at, article_extras.published_date, decks.insignia, decks.typeface
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 and kind = 'article'
                ORDER BY created_at desc
                LIMIT 10";
    let recent = sqlite::many(&conn, stmt, params![&user_id], from_row)?;

    let stmt = "SELECT decks.id, decks.name, article_extras.source, article_extras.author,
                       article_extras.short_description, coalesce(article_extras.rating, 0) as rating,
                       decks.created_at, article_extras.published_date, decks.insignia, decks.typeface
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND kind = 'article' AND article_extras.rating > 0
                ORDER BY article_extras.rating desc, decks.id desc";
    let rated = sqlite::many(&conn, stmt, params![&user_id], from_row)?;

    let stmt = "SELECT d.id, d.name, 'article', d.insignia, d.typeface
                FROM decks d LEFT JOIN article_extras pe ON pe.deck_id=d.id
                WHERE d.id NOT IN (SELECT deck_id
                                   FROM notes_decks
                                   GROUP BY deck_id)
                AND d.id NOT IN (SELECT n.deck_id
                                 FROM notes n INNER JOIN notes_decks nd ON n.id = nd.note_id
                                 GROUP by n.deck_id)
                AND d.kind = 'article'
                AND d.user_id = ?1
                ORDER BY d.created_at desc";
    let orphans = sqlite::many(&conn, stmt, params![&user_id], decks::slimdeck_from_row)?;

    Ok(interop::ArticleListings {
        recent,
        rated,
        orphans,
    })
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    article_id: Key,
) -> crate::Result<interop::Article> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, article_extras.source, article_extras.author,
                       article_extras.short_description, coalesce(article_extras.rating, 0) as rating,
                       decks.created_at, article_extras.published_date, decks.insignia, decks.typeface
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND id = ?2 AND kind = 'article'";
    let res = sqlite::one(&conn, stmt, params![&user_id, &article_id], from_row)?;

    decks::hit(&conn, article_id)?;

    Ok(res)
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, article_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, article_id)
}

fn article_extra_from_row(row: &Row) -> crate::Result<ArticleExtra> {
    Ok(ArticleExtra {
        source: row.get(1)?,
        author: row.get(2)?,
        short_description: row.get(3)?,
        rating: row.get(4)?,
        published_date: row.get(5)?,
    })
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    article: &interop::ProtoArticle,
    article_id: Key,
) -> crate::Result<interop::Article> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        article_id,
        DeckKind::Article,
        &article.title,
        graph_terminator,
        article.insignia,
        &article.typeface,
    )?;

    let stmt = "SELECT deck_id, source, author, short_description, rating, published_date
                FROM article_extras
                WHERE deck_id = ?1";
    let article_extras_exists =
        sqlite::many(&tx, stmt, params![&article_id], article_extra_from_row)?;

    let sql_query: &str = match article_extras_exists.len() {
        0 => {
            "INSERT INTO article_extras(deck_id, source, author, short_description, rating, published_date)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6)
              RETURNING deck_id, source, author, short_description, rating, published_date"
        }
        1 => {
            "UPDATE article_extras
              SET source = ?2, author = ?3, short_description = ?4, rating = ?5, published_date = ?6
              WHERE deck_id = ?1
              RETURNING deck_id, source, author, short_description, rating, published_date"
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

    let article_extras = sqlite::one(
        &tx,
        sql_query,
        params![
            &article_id,
            &article.source,
            &article.author,
            &article.short_description,
            &article.rating,
            &article.published_date,
        ],
        article_extra_from_row,
    )?;

    tx.commit()?;

    Ok((edited_deck, article_extras).into())
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> crate::Result<interop::Article> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let source = "";
    let author = "";
    let short_description = "";
    let rating = 0;
    let published_date = chrono::Utc::now().naive_utc().date();

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Article, title, "magazine")?;

    let article_extras =
        match origin {
            decks::DeckBaseOrigin::Created => sqlite::one(
                &tx,
                "INSERT INTO article_extras(deck_id, source, author, short_description, rating, published_date)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 RETURNING deck_id, source, author, short_description, rating, published_date",
                params![&deck.id, &source, &author, &short_description, &rating, &published_date],
                article_extra_from_row
            )?,
            decks::DeckBaseOrigin::PreExisting => sqlite::one(
                &tx,
                "select deck_id, source, author, short_description, rating, published_date
                 from article_extras
                 where deck_id=?1",
                params![&deck.id],
                article_extra_from_row
            )?
        };

    tx.commit()?;

    Ok((deck, article_extras).into())
}
