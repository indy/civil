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
use crate::db::sqlite::{self, FromRow, SqlitePool};
use crate::error::Error;
use crate::interop::decks::DeckKind;
use crate::interop::notes::NoteKind;
use crate::interop::quotes::{ProtoQuote, Quote};
use crate::interop::Key;

use rusqlite::{params, Row};
#[allow(unused_imports)]
use tracing::{error, info};

struct QuoteExtra {
    attribution: Option<String>,
}

impl FromRow for QuoteExtra {
    fn from_row(row: &Row) -> crate::Result<QuoteExtra> {
        Ok(QuoteExtra {
            attribution: row.get(0)?,
        })
    }
}

impl From<(decks::DeckBase, QuoteExtra)> for Quote {
    fn from(a: (decks::DeckBase, QuoteExtra)) -> Quote {
        let (deck, extra) = a;

        let attribution = if let Some(attribution) = extra.attribution {
            attribution
        } else {
            "".to_string()
        };

        Quote {
            id: deck.id,
            title: deck.title,
            deck_kind: deck.deck_kind,
            created_at: deck.created_at,
            graph_terminator: deck.graph_terminator,

            insignia: deck.insignia,
            font: deck.font,
            impact: deck.impact,

            attribution,

            notes: vec![],
            arrivals: vec![],
        }
    }
}

impl FromRow for Quote {
    fn from_row(row: &Row) -> crate::Result<Quote> {
        Ok(Quote {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,

            attribution: row.get(8)?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: &ProtoQuote,
) -> crate::Result<Quote> {
    let title = &quote.title;
    let text = &quote.text;
    let font = quote.font;
    let attribution = &quote.attribution;

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Quote, title, false, 0, font, 0)?;

    let quote_extras: QuoteExtra = match origin {
        decks::DeckBaseOrigin::Created => sqlite::one(
            &tx,
            "INSERT INTO quote_extras(deck_id, attribution)
                         VALUES (?1, ?2)
                         RETURNING attribution",
            params![&deck.id, &attribution],
        )?,
        decks::DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "select attribution
                 from quote_extras
                 where deck_id=?1",
            params![&deck.id],
        )?,
    };

    let kind = i32::from(NoteKind::Note);
    sqlite::zero(
        &tx,
        "INSERT INTO notes(user_id, deck_id, kind, content)
                  VALUES (?1, ?2, ?3, ?4)",
        params![&user_id, &deck.id, &kind, &text],
    )?;

    tx.commit()?;

    Ok((deck, quote_extras).into())
}

pub(crate) fn random(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Quote> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and kind = 'quote'
         ORDER BY random()
         LIMIT 1",
        params![&user_id],
    )
}

pub(crate) fn get(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<Quote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id = ?2 and kind = 'quote'",
        params![&user_id, &quote_id],
    )?;

    decks::hit(&conn, quote_id)?;

    Ok(res)
}

pub(crate) fn next(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<Quote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id > ?2 and kind = 'quote'
         ORDER BY id
         LIMIT 1",
        params![&user_id, &quote_id],
    );

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            sqlite::one(
                &conn,
                "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                quote_extras.attribution
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id
                 LIMIT 1",
                params![&user_id],
            )
        }
        Err(e) => Err(e),
    }
}

pub(crate) fn prev(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<Quote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id < ?2 and kind = 'quote'
         ORDER BY id desc
         LIMIT 1",
        params![&user_id, &quote_id],
    );

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            sqlite::one(
                &conn,
                "SELECT decks.id, decks.name, decks.kind, decks.created_at,
                        decks.graph_terminator, decks.insignia, decks.font, decks.impact,
                        quote_extras.attribution
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id desc
                 LIMIT 1",
                params![&user_id],
            )
        }
        Err(e) => Err(e),
    }
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: &ProtoQuote,
    quote_id: Key,
) -> crate::Result<Quote> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        quote_id,
        DeckKind::Quote,
        &quote.title,
        quote.graph_terminator,
        quote.insignia,
        quote.font,
        quote.impact,
    )?;

    let quote_extras_exists: Vec<QuoteExtra> = sqlite::many(
        &tx,
        "select attribution
         from quote_extras
         where deck_id=?1",
        params![&quote_id],
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

    let quote_extras = sqlite::one(&tx, sql_query, params![&quote_id, &quote.attribution])?;

    tx.commit()?;

    Ok((edited_deck, quote_extras).into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, quote_id)
}
