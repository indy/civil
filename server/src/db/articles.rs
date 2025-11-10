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

use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, decks, notes};
use crate::interop::Key;
use crate::interop::articles::{Article, ProtoArticle};
use crate::interop::decks::DeckKind;
use crate::interop::font::Font;
use rusqlite::{Row, params};

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
    fn from_row(row: &Row) -> rusqlite::Result<Article> {
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

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Article>, DbError> {
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

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    article_id: Key,
) -> Result<Option<Article>, DbError> {
    let stmt = "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                       decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                       article_extras.source,
                       article_extras.author,
                       article_extras.short_description,
                       article_extras.published_date
                FROM decks LEFT JOIN article_extras ON article_extras.deck_id = decks.id
                WHERE user_id = ?1 AND id = ?2 AND kind = ?3";

    let mut article: Option<Article> = sqlite::one_optional(
        &conn,
        stmt,
        params![user_id, article_id, DeckKind::Article.to_string()],
    )?;

    if let Some(ref mut a) = article {
        a.notes = notes::notes_for_deck(conn, article_id)?;
        a.arrivals = notes::arrivals_for_deck(conn, article_id)?;
        decks::hit(&conn, article_id)?;
    }

    Ok(article)
}

impl FromRow for ArticleExtra {
    fn from_row(row: &Row) -> rusqlite::Result<ArticleExtra> {
        Ok(ArticleExtra {
            source: row.get(1)?,
            author: row.get(2)?,
            short_description: row.get(3)?,
            published_date: row.get(4)?,
        })
    }
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    article: ProtoArticle,
    article_id: Key,
) -> Result<Article, DbError> {
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
            return Err(DbError::TooManyFound);
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

    let mut article: Article = (edited_deck, article_extras).into();
    article.notes = notes::notes_for_deck(conn, article_id)?;
    article.arrivals = notes::arrivals_for_deck(conn, article_id)?;

    Ok(article)
}

pub(crate) fn get_or_create(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Article, DbError> {
    let tx = conn.transaction()?;

    let source = "";
    let author = "";
    let short_description = "";
    let published_date = chrono::Utc::now().naive_utc().date();

    let (deck, origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Article,
        &title,
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

    let mut article: Article = (deck, article_extras).into();

    article.notes = notes::notes_for_deck(conn, article.id)?;
    article.arrivals = notes::arrivals_for_deck(conn, article.id)?;

    Ok(article)
}
