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

use crate::db::notes as notes_db;
use crate::db::decks::DECKBASE_QUERY;
use crate::db::decks;
use crate::db::{SqlitePool, DbError, db};
use crate::db::sqlite::{self, FromRow};
use crate::interop::decks::DeckKind;
use crate::interop::notes::NoteKind;
use crate::interop::quotes::{ProtoQuote, Quote};
use crate::interop::Key;

use rusqlite::{params, OptionalExtension, Row};

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

fn from_rusqlite_row(row: &Row) -> rusqlite::Result<Quote> {
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

fn get_or_create_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    quote: ProtoQuote,
) -> Result<Quote, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create_conn(
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
    sqlite::zero_conn(
        &tx,
        "INSERT INTO notes(user_id, deck_id, kind, content)
                  VALUES (?1, ?2, ?3, ?4)",
        params![&user_id, &deck.id, &kind, &content],
    )?;

    tx.commit()?;

    let mut quote: Quote = deck.into();

    quote.notes = notes_db::notes_for_deck_conn(conn, quote.id)?;
    quote.arrivals = notes_db::arrivals_for_deck_conn(conn, quote.id)?;

    Ok(quote)
}

pub(crate) async fn get_or_create(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: ProtoQuote,
) -> crate::Result<Quote> {
    db(sqlite_pool, move |conn| get_or_create_conn(conn, user_id, quote))
        .await
        .map_err(Into::into)
}

fn random_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
) -> Result<Option<Quote>, DbError> {
    let mut quote = conn.prepare_cached("SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
         WHERE user_id = ?1 and kind = 'quote'
         ORDER BY random()
         LIMIT 1")?
        .query_row(params![user_id], |row| from_rusqlite_row(row))
        .optional()?;

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck_conn(conn, i.id)?;
        i.arrivals = notes_db::arrivals_for_deck_conn(conn, i.id)?;
        // nocheckin it makes sense for all the other hit_conn calls to be in the Some block
        decks::hit_conn(&conn, i.id)?;
    }

    Ok(quote)
}

pub(crate) async fn random(sqlite_pool: &SqlitePool, user_id: Key) -> crate::Result<Option<Quote>> {
    db(sqlite_pool, move |conn| random_conn(conn, user_id))
        .await
        .map_err(Into::into)
}

fn get_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key
) -> Result<Option<Quote>, DbError> {

    let mut quote = conn.prepare_cached(DECKBASE_QUERY)?
        .query_row(params![user_id, quote_id, DeckKind::Quote.to_string()], |row| from_rusqlite_row(row))
        .optional()?;

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck_conn(conn, quote_id)?;
        i.arrivals = notes_db::arrivals_for_deck_conn(conn, quote_id)?;
        decks::hit_conn(&conn, quote_id)?;
    }

    Ok(quote)
}

pub(crate) async fn get(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<Option<Quote>> {
    db(sqlite_pool, move |conn| get_conn(conn, user_id, quote_id))
        .await
        .map_err(Into::into)
}

fn next_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key
) -> Result<Option<Quote>, DbError> {

    let mut quote = conn.prepare_cached("SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
         WHERE user_id = ?1 and id > ?2 and kind = 'quote'
         ORDER BY id
         LIMIT 1")?
        .query_row(params![user_id, quote_id], |row| from_rusqlite_row(row))
        .optional()?;


    if let None = quote {
        quote = conn.prepare_cached("SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                 FROM decks
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id
                 LIMIT 1")?
        .query_row(params![user_id], |row| from_rusqlite_row(row))
        .optional()?;
    }

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck_conn(conn, quote_id)?;
        i.arrivals = notes_db::arrivals_for_deck_conn(conn, quote_id)?;
        decks::hit_conn(&conn, i.id)?;
    }

    Ok(quote)
}

pub(crate) async fn next(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<Option<Quote>> {
    db(sqlite_pool, move |conn| next_conn(conn, user_id, quote_id))
        .await
        .map_err(Into::into)
}

fn prev_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key
) -> Result<Option<Quote>, DbError> {

    let mut quote = conn.prepare_cached("SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
         FROM decks
         WHERE user_id = ?1 and id < ?2 and kind = 'quote'
         ORDER BY id desc
         LIMIT 1")?
        .query_row(params![user_id, quote_id], |row| from_rusqlite_row(row))
        .optional()?;


    if let None = quote {
        quote = conn.prepare_cached("SELECT id, name, kind, created_at, graph_terminator, insignia, font, impact
                 FROM decks
                 WHERE user_id = ?1 and kind = 'quote'
                 ORDER BY id desc
                 LIMIT 1")?
        .query_row(params![user_id], |row| from_rusqlite_row(row))
        .optional()?;
    }

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck_conn(conn, quote_id)?;
        i.arrivals = notes_db::arrivals_for_deck_conn(conn, quote_id)?;
        decks::hit_conn(&conn, i.id)?;
    }

    Ok(quote)
}

pub(crate) async fn prev(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<Option<Quote>> {
    db(sqlite_pool, move |conn| prev_conn(conn, user_id, quote_id))
        .await
        .map_err(Into::into)
}

fn edit_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    quote: ProtoQuote,
    quote_id: Key
) -> Result<Quote, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit_conn(
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

    let mut quote: Quote = deck.into();

    quote.notes = notes_db::notes_for_deck_conn(conn, quote_id)?;
    quote.arrivals = notes_db::arrivals_for_deck_conn(conn, quote_id)?;

    Ok(quote)
}

pub(crate) async fn edit(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    quote: ProtoQuote,
    quote_id: Key,
) -> crate::Result<Quote> {
    db(sqlite_pool, move |conn| edit_conn(conn, user_id, quote, quote_id))
        .await
        .map_err(Into::into)
}


fn delete_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key
) -> Result<(), DbError> {

    decks::delete_conn(&conn, user_id, quote_id)?;

    Ok(())
}

pub(crate) async fn delete(sqlite_pool: &SqlitePool, user_id: Key, quote_id: Key) -> crate::Result<()> {
    db(sqlite_pool, move |conn| delete_conn(conn, user_id, quote_id))
        .await
        .map_err(Into::into)
}
