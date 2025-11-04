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
use crate::db::notes;
use crate::db::{SqlitePool, DbError};
use crate::db::sqlite::{self, FromRow};
use crate::error::Error;
use crate::interop::articles::{Article, ProtoArticle};
use crate::interop::decks::{DeckKind, Pagination, SlimDeck};
use crate::interop::font::Font;
use crate::interop::Key;
use rusqlite::{params, Row};

use tracing::error;

#[derive(Debug, Clone)]
struct ArticleExtra {
    source: Option<String>,
    author: Option<String>,
    short_description: Option<String>,
    published_date: Option<chrono::NaiveDate>,
}

impl From<(decks::DeckBase, ArticleExtra)> for Article {
    fn from(a: (decks::DeckBase, ArticleExtra)) -> Article {
        let (deck, extra) = a;
        Article {
            id: deck.id,
            title: deck.title,
            deck_kind: DeckKind::Article,
            created_at: deck.created_at,
            graph_terminator: deck.graph_terminator,
            insignia: deck.insignia,
            font: deck.font,
            impact: deck.impact,

            source: extra.source,
            author: extra.author,
            short_description: extra.short_description,
            published_date: extra.published_date,

            notes: vec![],
            arrivals: vec![],
        }
    }
}

impl FromRow for Article {
    fn from_row(row: &Row) -> crate::Result<Article> {
        Ok(Article {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,

            source: row.get(8)?,
            author: row.get(9)?,
            short_description: row.get(10)?,
            published_date: row.get(11)?,

            notes: vec![],
            arrivals: vec![],
        })
    }

    fn from_row_conn(row: &Row) -> Result<Article, DbError> {
        Ok(Article {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,

            source: row.get(8)?,
            author: row.get(9)?,
            short_description: row.get(10)?,
            published_date: row.get(11)?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn all(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Vec<Article>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                       decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       article_extras.source,
                       article_extras.author,
                       article_extras.short_description,
                       article_extras.published_date
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND kind = 'article'
                ORDER BY created_at DESC";
    sqlite::many(&conn, stmt, params![&user_id])
}

pub(crate) fn recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<Article>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                       decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       article_extras.source,
                       article_extras.author,
                       article_extras.short_description,
                       article_extras.published_date
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 and kind = 'article'
                ORDER BY created_at desc
                LIMIT ?2
                OFFSET ?3";
    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM decks
                WHERE user_id = ?1 and kind = 'article'";
    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<Article> { items, total_items };

    Ok(res)
}

pub(crate) fn rated(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<Article>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                       decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       article_extras.source,
                       article_extras.author,
                       article_extras.short_description,
                       article_extras.published_date
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND kind = 'article' AND decks.impact > 0
                ORDER BY decks.impact desc, decks.id desc
                LIMIT ?2
                OFFSET ?3";
    let items: Vec<Article> = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND kind = 'article' AND decks.impact > 0";

    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<Article> { items, total_items };

    Ok(res)
}

pub(crate) fn orphans(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> crate::Result<Pagination<SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact
                FROM decks d LEFT JOIN article_extras pe ON pe.deck_id=d.id
                WHERE d.id NOT IN (SELECT deck_id
                                   FROM refs
                                   GROUP BY deck_id)
                AND d.id NOT IN (SELECT n.deck_id
                                 FROM notes n INNER JOIN refs r ON n.id = r.note_id
                                 GROUP by n.deck_id)
                AND d.kind = 'article'
                AND d.user_id = ?1
                ORDER BY d.created_at desc
                LIMIT ?2
                OFFSET ?3";
    let items = sqlite::many(&conn, stmt, params![&user_id, &num_items, &offset])?;

    let stmt = "SELECT count(*)
                FROM decks d LEFT JOIN article_extras pe ON pe.deck_id=d.id
                WHERE d.id NOT IN (SELECT deck_id
                                   FROM refs
                                   GROUP BY deck_id)
                AND d.id NOT IN (SELECT n.deck_id
                                 FROM notes n INNER JOIN refs r ON n.id = r.note_id
                                 GROUP by n.deck_id)
                AND d.kind = 'article'
                AND d.user_id = ?1";
    let total_items = sqlite::one(&conn, stmt, params![user_id])?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    article_id: Key,
) -> crate::Result<Article> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                       decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       article_extras.source,
                       article_extras.author,
                       article_extras.short_description,
                       article_extras.published_date
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND id = ?2 AND kind = 'article'";
    let res = sqlite::one(&conn, stmt, params![&user_id, &article_id])?;

    decks::hit(&conn, article_id)?;

    Ok(res)
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, article_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, article_id)
}

impl FromRow for ArticleExtra {
    fn from_row(row: &Row) -> crate::Result<ArticleExtra> {
        Ok(ArticleExtra {
            source: row.get(1)?,
            author: row.get(2)?,
            short_description: row.get(3)?,
            published_date: row.get(4)?,
        })
    }

    fn from_row_conn(row: &Row) -> Result<ArticleExtra, DbError> {
        Ok(ArticleExtra {
            source: row.get(1)?,
            author: row.get(2)?,
            short_description: row.get(3)?,
            published_date: row.get(4)?,
        })
    }
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    article: &ProtoArticle,
    article_id: Key,
) -> crate::Result<Article> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        article_id,
        DeckKind::Article,
        &article.title,
        article.graph_terminator,
        article.insignia,
        article.font,
        article.impact,
    )?;

    let stmt = "SELECT deck_id, source, author, short_description, published_date
                FROM article_extras
                WHERE deck_id = ?1";
    let article_extras_exists: Vec<ArticleExtra> = sqlite::many(&tx, stmt, params![&article_id])?;

    const TWITTER_INSIGNIA_BIT: i32 = 1;
    const BOOK_INSIGNIA_BIT: i32 = 2;

    // twitter threads will use the sans font
    if (article.insignia & TWITTER_INSIGNIA_BIT) == TWITTER_INSIGNIA_BIT {
        dbg!("make look like twitter");
        decks::overwrite_deck_font(&tx, user_id, article_id, Font::Sans)?;
        notes::overwrite_note_fonts(&tx, user_id, article_id, Font::Sans)?;
    }
    // make book articles look bookish
    if (article.insignia & BOOK_INSIGNIA_BIT) == BOOK_INSIGNIA_BIT {
        dbg!("make look like a book");
        decks::overwrite_deck_font(&tx, user_id, article_id, Font::Serif)?;
        notes::overwrite_note_fonts(&tx, user_id, article_id, Font::Serif)?;
    }

    let sql_query: &str = match article_extras_exists.len() {
        0 => {
            "INSERT INTO article_extras(deck_id, source, author, short_description, published_date)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6)
              RETURNING deck_id, source, author, short_description, published_date"
        }
        1 => {
            "UPDATE article_extras
              SET source = ?2, author = ?3, short_description = ?4, published_date = ?5
              WHERE deck_id = ?1
              RETURNING deck_id, source, author, short_description, published_date"
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
            &article.published_date,
        ],
    )?;

    tx.commit()?;

    Ok((edited_deck, article_extras).into())
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    title: &str,
) -> crate::Result<Article> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let source = "";
    let author = "";
    let short_description = "";
    let published_date = chrono::Utc::now().naive_utc().date();

    let (deck, origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Article,
        title,
        false,
        0,
        Font::Serif,
        1,
    )?;

    let article_extras = match origin {
        decks::DeckBaseOrigin::Created => sqlite::one(
            &tx,
            "INSERT INTO article_extras(deck_id, source, author, short_description, published_date)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 RETURNING deck_id, source, author, short_description, published_date",
            params![
                &deck.id,
                &source,
                &author,
                &short_description,
                &published_date
            ],
        )?,
        decks::DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "select deck_id, source, author, short_description, published_date
                 from article_extras
                 where deck_id=?1",
            params![&deck.id],
        )?,
    };

    tx.commit()?;

    Ok((deck, article_extras).into())
}
