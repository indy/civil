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
use crate::interop::decks::DeckKind;
use crate::interop::font::Font;
use crate::interop::notes as interop_notes;
use crate::interop::quotes as interop;
use crate::interop::Key;

use rusqlite::{params, Row};
#[allow(unused_imports)]
use tracing::{error, info};

struct QuoteExtra {
    attribution: Option<String>,
}

fn quote_extra_from_row(row: &Row) -> crate::Result<QuoteExtra> {
    Ok(QuoteExtra {
        attribution: row.get(0)?,
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
            title: deck.title,

            deck_kind: DeckKind::Quote,

            attribution,

            insignia: deck.insignia,
            font: deck.font,

            notes: vec![],

            refs: vec![],

            backnotes: vec![],
            backrefs: vec![],

            flashcards: vec![],
        }
    }
}

fn quote_from_row(row: &Row) -> crate::Result<interop::Quote> {
    let fnt: i32 = row.get(4)?;

    Ok(interop::Quote {
        id: row.get(0)?,
        title: row.get(1)?,
        deck_kind: DeckKind::Quote,
        attribution: row.get(2)?,
        insignia: row.get(3)?,
        font: Font::try_from(fnt)?,

        notes: vec![],

        refs: vec![],

        backnotes: vec![],
        backrefs: vec![],

        flashcards: vec![],
    })
}

pub(crate) fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: &interop::ProtoQuote,
) -> crate::Result<interop::Quote> {
    let title = &quote.title;
    let text = &quote.text;
    let font = quote.font;
    let attribution = &quote.attribution;

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, origin) = decks::deckbase_get_or_create(&tx, user_id, DeckKind::Quote, title, font)?;

    let quote_extras: QuoteExtra = match origin {
        decks::DeckBaseOrigin::Created => sqlite::one(
            &tx,
            "INSERT INTO quote_extras(deck_id, attribution)
                         VALUES (?1, ?2)
                         RETURNING attribution",
            params![&deck.id, &attribution],
            quote_extra_from_row,
        )?,
        decks::DeckBaseOrigin::PreExisting => sqlite::one(
            &tx,
            "select attribution
                 from quote_extras
                 where deck_id=?1",
            params![&deck.id],
            quote_extra_from_row,
        )?,
    };

    let kind = i32::from(interop_notes::NoteKind::Note);
    sqlite::zero(
        &tx,
        "INSERT INTO notes(user_id, deck_id, kind, content)
                  VALUES (?1, ?2, ?3, ?4)",
        params![&user_id, &deck.id, &kind, &text],
    )?;

    tx.commit()?;

    Ok((deck, quote_extras).into())
}

pub(crate) fn random(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<interop::Quote> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution, decks.insignia, decks.font
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and kind = 'quote'
         ORDER BY random()
         LIMIT 1",
        params![&user_id],
        quote_from_row,
    )
}

pub(crate) fn get(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote_id: Key,
) -> crate::Result<interop::Quote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution, decks.insignia, decks.font
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id = ?2 and kind = 'quote'",
        params![&user_id, &quote_id],
        quote_from_row,
    )?;

    decks::hit(&conn, quote_id)?;

    Ok(res)
}

pub(crate) fn next(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote_id: Key,
) -> crate::Result<interop::Quote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution, decks.insignia, decks.font
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id > ?2 and kind = 'quote'
         ORDER BY id
         LIMIT 1",
        params![&user_id, &quote_id],
        quote_from_row,
    );

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            sqlite::one(
                &conn,
                "SELECT decks.id, decks.name, quote_extras.attribution, decks.insignia, decks.font
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id
                 LIMIT 1",
                params![&user_id],
                quote_from_row,
            )
        }
        Err(e) => Err(e),
    }
}

pub(crate) fn prev(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote_id: Key,
) -> crate::Result<interop::Quote> {
    let conn = sqlite_pool.get()?;

    let res = sqlite::one(
        &conn,
        "SELECT decks.id, decks.name, quote_extras.attribution, decks.insignia, decks.font
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = ?1 and id < ?2 and kind = 'quote'
         ORDER BY id desc
         LIMIT 1",
        params![&user_id, &quote_id],
        quote_from_row,
    );

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            sqlite::one(
                &conn,
                "SELECT decks.id, decks.name, quote_extras.attribution, decks.insignia, decks.font
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id desc
                 LIMIT 1",
                params![&user_id],
                quote_from_row,
            )
        }
        Err(e) => Err(e),
    }
}

pub(crate) fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: &interop::ProtoQuote,
    quote_id: Key,
) -> crate::Result<interop::Quote> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        quote_id,
        DeckKind::Quote,
        &quote.title,
        graph_terminator,
        quote.insignia,
        quote.font,
    )?;

    let quote_extras_exists = sqlite::many(
        &tx,
        "select attribution
         from quote_extras
         where deck_id=?1",
        params![&quote_id],
        quote_extra_from_row,
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

    let quote_extras = sqlite::one(
        &tx,
        sql_query,
        params![&quote_id, &quote.attribution],
        quote_extra_from_row,
    )?;

    tx.commit()?;

    Ok((edited_deck, quote_extras).into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, quote_id)
}
