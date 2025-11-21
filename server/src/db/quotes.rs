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

use crate::db::DbError;
use crate::db::decks;
use crate::db::notes as notes_db;
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::DeckKind;
use crate::interop::notes::NoteKind;
use crate::interop::quotes::{ProtoQuote, Quote};
use rusqlite::{Row, named_params};

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
    fn from_row(row: &Row) -> rusqlite::Result<Quote> {
        Ok(Quote {
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,

            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    quote: ProtoQuote,
) -> Result<Quote, DbError> {
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

    sqlite::zero(
        &tx,
        &Qry::insert("notes(user_id, deck_id, kind, content)")
            .values("(:user_id, :deck_id, :kind, :content)"),
        named_params! {":user_id": user_id, ":deck_id": deck.id, ":kind": NoteKind::Note, ":content": content},
    )?;

    tx.commit()?;

    let mut quote: Quote = deck.into();

    quote.notes = notes_db::notes_for_deck(conn, quote.id)?;
    quote.arrivals = notes_db::arrivals_for_deck(conn, quote.id)?;

    Ok(quote)
}

pub(crate) fn random(conn: &rusqlite::Connection, user_id: Key) -> Result<Option<Quote>, DbError> {
    let mut quote: Option<Quote> = sqlite::one_optional(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .order_by("random()")
            .limit(),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Quote, ":limit": 1},
    )?;

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck(conn, i.id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, i.id)?;
        decks::hit(&conn, i.id)?;
    }

    Ok(quote)
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key,
) -> Result<Option<Quote>, DbError> {
    let mut quote: Option<Quote> = sqlite::one_optional(
        &conn,
        &Qry::query_decklike_generic(),
        named_params! {":user_id": user_id, ":deck_id": quote_id, ":deck_kind": DeckKind::Quote},
    )?;

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck(conn, quote_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, quote_id)?;
        decks::hit(&conn, quote_id)?;
    }

    Ok(quote)
}

pub(crate) fn next(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key,
) -> Result<Option<Quote>, DbError> {
    let mut quote: Option<Quote> = sqlite::one_optional(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("id > :deck_id")
            .order_by("id")
            .limit(),
        named_params! {":user_id": user_id, ":deck_id": quote_id, ":deck_kind": DeckKind::Quote, ":limit": 1},
    )?;

    if let None = quote {
        quote = sqlite::one_optional(
            &conn,
            &Qry::select_decklike()
                .from_decklike()
                .where_decklike_but_no_deck_id()
                .order_by("id")
                .limit(),
            named_params! {":user_id": user_id, ":deck_kind": DeckKind::Quote, ":limit": 1},
        )?;
    }

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck(conn, quote_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, quote_id)?;
        decks::hit(&conn, i.id)?;
    }

    Ok(quote)
}

pub(crate) fn prev(
    conn: &rusqlite::Connection,
    user_id: Key,
    quote_id: Key,
) -> Result<Option<Quote>, DbError> {
    let mut quote: Option<Quote> = sqlite::one_optional(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("id < :deck_id")
            .order_by("id desc")
            .limit(),
        named_params! {":user_id": user_id, ":deck_id": quote_id, ":deck_kind": DeckKind::Quote, ":limit": 1},
    )?;

    if let None = quote {
        quote = sqlite::one_optional(
            &conn,
            &Qry::select_decklike()
                .from_decklike()
                .where_decklike_but_no_deck_id()
                .order_by("id desc")
                .limit(),
            named_params! {":user_id": user_id, ":deck_kind": DeckKind::Quote, ":limit": 1},
        )?;
    }

    if let Some(ref mut i) = quote {
        i.notes = notes_db::notes_for_deck(conn, quote_id)?;
        i.arrivals = notes_db::arrivals_for_deck(conn, quote_id)?;
        decks::hit(&conn, i.id)?;
    }

    Ok(quote)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    quote: ProtoQuote,
    quote_id: Key,
) -> Result<Quote, DbError> {
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

    let mut quote: Quote = deck.into();

    quote.notes = notes_db::notes_for_deck(conn, quote_id)?;
    quote.arrivals = notes_db::arrivals_for_deck(conn, quote_id)?;

    Ok(quote)
}
