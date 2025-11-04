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
use crate::db::{SqlitePool, DbError};
use crate::db::sqlite::{self, FromRow};
use crate::error::Error;
use crate::interop::decks::DeckKind;
use crate::interop::notes::NoteKind;
use crate::interop::quotes::{ProtoQuote, Quote};
use crate::interop::Key;

use rusqlite::{params, Row};
#[allow(unused_imports)]
use tracing::{error, info};


impl From<decks::DeckBase> for Quote {
    fn from(deck: decks::DeckBase) -> Quote {
        Quote {
            id: deck.id,
            title: deck.title,
            deck_kind: deck.deck_kind,
            created_at: deck.created_at,
            graph_terminator: deck.graph_terminator,

            insignia: deck.insignia,
            font: deck.font,
            impact: deck.impact,

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

            notes: vec![],
            arrivals: vec![],
        })
    }

    fn from_row_conn(row: &Row) -> Result<Quote, DbError> {
        Ok(Quote {
            id: row.get(0)?,
            title: row.get(1)?,
            deck_kind: row.get(2)?,
            created_at: row.get(3)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: row.get(6)?,
            impact: row.get(7)?,

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
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Quote,
        &quote.title,
        quote.graph_terminator,
        quote.insignia,
        quote.font,
        quote.impact,
    )?;

    // combine the separate quote text and attribution into a single block of content that can be stored as a single note
    //
    let text = &quote.text;
    let attribution = &quote.attribution;
    let content = format!(":quote({}::{})", text, attribution);

    let kind = i32::from(NoteKind::Note);
    sqlite::zero(
        &tx,
        "INSERT INTO notes(user_id, deck_id, kind, content)
                  VALUES (?1, ?2, ?3, ?4)",
        params![&user_id, &deck.id, &kind, &content],
    )?;

    tx.commit()?;

    Ok(deck.into())
}

pub(crate) fn random(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Quote> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
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
        "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
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
        "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
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
                "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                 FROM decks
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
        "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
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
                "SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                 FROM decks
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

    let deck = decks::deckbase_edit(
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

    tx.commit()?;
    Ok(deck.into())
}

pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<()> {
    decks::delete(sqlite_pool, user_id, quote_id)
}
