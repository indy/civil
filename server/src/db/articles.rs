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

use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, decks, notes};
use crate::interop::Key;
use crate::interop::articles::{Article, ProtoArticle};
use crate::interop::decks::DeckKind;
use crate::interop::font::Font;
use rusqlite::{Row, named_params};

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
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,

            source: row.get("source")?,
            author: row.get("author")?,
            short_description: row.get("short_description")?,
            published_date: row.get("published_date")?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

fn build_query_partial() -> Qry {
    Qry::select_decklike()
        .comma(
            "article_extras.source as source,
               article_extras.author as author,
               article_extras.short_description as short_description,
               article_extras.published_date as published_date ",
        )
        .from_decklike()
        .left_join("article_extras ON article_extras.deck_id = d.id ")
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Article>, DbError> {
    sqlite::many(
        &conn,
        &build_query_partial()
            .where_decklike_but_no_deck_id()
            .order_by("created_at DESC"),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Article},
    )
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    article_id: Key,
) -> Result<Option<Article>, DbError> {
    let mut article: Option<Article> = sqlite::one_optional(
        &conn,
        &build_query_partial().where_decklike(),
        named_params! {":user_id": user_id, ":deck_id": article_id, ":deck_kind": DeckKind::Article},
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
            source: row.get("source")?,
            author: row.get("author")?,
            short_description: row.get("short_description")?,
            published_date: row.get("published_date")?,
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

    let article_extras_exists: Vec<ArticleExtra> = sqlite::many(
        &tx,
        &Qry::select("deck_id, source, author, short_description, published_date")
            .from("article_extras")
            .where_clause("deck_id = :deck_id"),
        named_params! {":deck_id": article_id},
    )?;

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
              VALUES (:deck_id, :source, :author, :short_description, :published_date)
              RETURNING deck_id, source, author, short_description, published_date"
        }
        1 => {
            "UPDATE article_extras
              SET source = :source, author = :author, short_description = :short_description, published_date = :published_date
              WHERE deck_id = :deck_id
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
        named_params! {
            ":deck_id": article_id,
            ":source": article.source,
            ":author": article.author,
            ":short_description": article.short_description,
            ":published_date": article.published_date,
        },
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
            &Qry::new("")
                .insert_into(
                    "article_extras(deck_id, source, author, short_description, published_date)",
                )
                .values(":deck_id, :source, :author, :short_description, :published_date")
                .returning("deck_id, source, author, short_description, published_date"),
            named_params! {
                ":deck_id": deck.id,
                ":source": source,
                ":author": author,
                ":short_description": short_description,
                ":published_date": published_date,
            },
        )?,
        decks::DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "select deck_id, source, author, short_description, published_date
                 from article_extras
                 where deck_id=:deck_id",
            named_params! {":deck_id": deck.id},
        )?,
    };

    tx.commit()?;

    let mut article: Article = (deck, article_extras).into();

    article.notes = notes::notes_for_deck(conn, article.id)?;
    article.arrivals = notes::arrivals_for_deck(conn, article.id)?;

    Ok(article)
}
