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


use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::error::{Error, Result};
use crate::interop::notes as interop_notes;
use crate::interop::quotes as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;


#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Quote {
    id: Key,
    name: String,
    attribution: String,
}

impl From<Quote> for interop::Quote {
    fn from(a: Quote) -> interop::Quote {
        interop::Quote {
            id: a.id,
            title: a.name,
            attribution: a.attribution,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "quote_extras")]
struct QuoteExtra {
    deck_id: Key,
    attribution: Option<String>,
}

struct SqliteQuoteExtra {
    attribution: Option<String>,
}

fn sqlite_quote_extra_from_row(row: &Row) -> Result<SqliteQuoteExtra> {
    Ok(SqliteQuoteExtra {
        attribution: row.get(0)?
    })
}

impl From<(decks::DeckBase, QuoteExtra)> for interop::Quote {
    fn from(a: (decks::DeckBase, QuoteExtra)) -> interop::Quote {
        let (deck, extra) = a;

        let attribution = if let Some(attribution) = extra.attribution {
            attribution
        } else {
            "".to_string()
        };

        interop::Quote {
            id: deck.id,
            title: deck.name,
            attribution,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

impl From<(decks::SqliteDeckBase, SqliteQuoteExtra)> for interop::SqliteQuote {
    fn from(a: (decks::SqliteDeckBase, SqliteQuoteExtra)) -> interop::SqliteQuote {
        let (deck, extra) = a;

        let attribution = if let Some(attribution) = extra.attribution {
            attribution
        } else {
            "".to_string()
        };

        interop::SqliteQuote {
            id: deck.id,
            title: deck.name,
            attribution,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}


fn quote_from_row(row: &Row) -> Result<interop::SqliteQuote> {
    Ok(interop::SqliteQuote {
        id: row.get(0)?,
        title: row.get(1)?,
        attribution: row.get(2)?,
        notes: None,

        refs: None,

        backnotes: None,
        backrefs: None,

        flashcards: None,
    })
}

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Row, params};

pub(crate) fn sqlite_get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: &interop::ProtoQuote,
) -> Result<interop::SqliteQuote> {
    let title = &quote.title;
    let text = &quote.text;
    let attribution = &quote.attribution;


    let conn = sqlite_pool.get()?;

    let (deck, origin) = decks::sqlite_deckbase_get_or_create(&conn, user_id, DeckKind::Quote, &title)?;

    let quote_extras: SqliteQuoteExtra = match origin {
        decks::DeckBaseOrigin::Created => {
            sqlite::one(&conn,
                        "INSERT INTO quote_extras(deck_id, attribution)
                         VALUES (?1, ?2)
                         RETURNING attribution",
                        params![&deck.id, &attribution],
                        sqlite_quote_extra_from_row)?
        }
        decks::DeckBaseOrigin::PreExisting => {
            sqlite::one(&conn,
                        "select attribution
                 from quote_extras
                 where deck_id=?1",
                        params![&deck.id],
                        sqlite_quote_extra_from_row)?

        }
    };

    let k = interop_notes::note_kind_to_sqlite_string(interop_notes::NoteKind::Note)?;

    sqlite::zero(&conn,
                 "INSERT INTO notes(user_id, deck_id, kind, content)
                  VALUES (?1, ?2, ?3, ?4)",
                 params![&user_id, &deck.id, &k, &text])?;

    Ok((deck, quote_extras).into())
}

pub(crate) fn sqlite_random(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::SqliteQuote> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and kind = 'quote'
         ORDER BY random()
         LIMIT 1",
        params![&user_id],
        quote_from_row
    )
}

pub(crate) fn sqlite_get(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> Result<interop::SqliteQuote> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id = ?2 and kind = 'quote'",
        params![&user_id, &quote_id],
        quote_from_row
    )
}


pub(crate) fn sqlite_next(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> Result<interop::SqliteQuote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id > ?2 and kind = 'quote'
         ORDER BY id
         LIMIT 1",
        params![&user_id, &quote_id],
        quote_from_row
    );

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            sqlite::one(
                &conn,
                "SELECT decks.id, decks.name, quote_extras.attribution
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id
                 LIMIT 1",
                params![&user_id],
                quote_from_row
            )
        }
        Err(e) => Err(e),
    }
}

pub(crate) fn sqlite_prev(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> Result<interop::SqliteQuote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id < ?2 and kind = 'quote'
         ORDER BY id desc
         LIMIT 1",
        params![&user_id, &quote_id],
        quote_from_row
    );

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            sqlite::one(
                &conn,
                "SELECT decks.id, decks.name, quote_extras.attribution
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id desc
                 LIMIT 1",
                params![&user_id],
                quote_from_row
            )
        }
        Err(e) => Err(e),
    }
}

pub(crate) fn sqlite_edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: &interop::ProtoQuote,
    quote_id: Key,
) -> Result<interop::SqliteQuote> {
    let conn = sqlite_pool.get()?;

    let graph_terminator = false;
    let edited_deck = decks::sqlite_deckbase_edit(
        &conn,
        user_id,
        quote_id,
        DeckKind::Quote,
        &quote.title,
        graph_terminator,
    )?;

    let quote_extras_exists = sqlite::many(
        &conn,
        "select attribution
         from quote_extras
         where deck_id=?1",
        params![&quote_id],
        sqlite_quote_extra_from_row
    )?;

    let sql_query: &str = match quote_extras_exists.len() {
        0 => {
            "INSERT INTO quote_extras(deck_id, attribution)
             VALUES (?1, ?2)
             RETURNING attribution"
        }
        1 => {
            "UPDATE quote_extras
             SET attribution = ?2
             WHERE deck_id = ?1
             RETURNING attribution"
        }
        _ => {
            // should be impossible to get here since deck_id
            // is a primary key in the quote_extras table
            error!("multiple quote_extras entries for quote: {}", &quote_id);
            return Err(Error::TooManyFound);
        }
    };

    let quote_extras = sqlite::one(&conn,
                                   sql_query,
                                   params![&quote_id, &quote.attribution],
                                   sqlite_quote_extra_from_row)?;


    Ok((edited_deck, quote_extras).into())
}

pub(crate) fn sqlite_delete(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> Result<()> {
    decks::sqlite_delete(sqlite_pool, user_id, quote_id)
}
