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

use super::pg;
use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::db::note_kind::NoteKind;
use crate::db::notes as db_notes;
use crate::error::{Error, Result};
use crate::interop::decks as interop_decks;
use crate::interop::quotes as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::{error, info};

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

pub(crate) async fn get_or_create(
    db_pool: &Pool,
    user_id: Key,
    quote: &interop::ProtoQuote,
) -> Result<interop::Quote> {
    let title = &quote.title;
    let text = &quote.text;
    let attribution = &quote.attribution;

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;

    let tx = client.transaction().await?;

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Quote, &title).await?;

    let quote_extras = match origin {
        decks::DeckBaseOrigin::Created => {
            pg::one::<QuoteExtra>(
                &tx,
                "INSERT INTO quote_extras(deck_id, attribution)
                 VALUES ($1, $2)
                 RETURNING $table_fields",
                &[&deck.id, &attribution],
            )
            .await?
        }
        decks::DeckBaseOrigin::PreExisting => {
            pg::one::<QuoteExtra>(
                &tx,
                "select deck_id, attribution
                 from quote_extras
                 where deck_id=$1",
                &[&deck.id],
            )
            .await?
        }
    };

    let kind = NoteKind::Note;

    let _db_note = pg::one::<db_notes::Note>(
        &tx,
        "INSERT INTO notes(user_id, deck_id, kind, content)
         VALUES ($1, $2, $3, $4)
         RETURNING $table_fields",
        &[&user_id, &deck.id, &kind, &text],
    )
    .await?;

    tx.commit().await?;

    Ok((deck, quote_extras).into())
}

pub(crate) async fn search(
    db_pool: &Pool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop_decks::DeckSimple>> {
    decks::search_within_deck_kind_by_name(db_pool, user_id, DeckKind::Quote, query).await
}

pub(crate) async fn random(db_pool: &Pool, user_id: Key) -> Result<interop::Quote> {
    pg::one_from::<Quote, interop::Quote>(
        db_pool,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = $1 and kind = 'quote'
         ORDER BY random()
         LIMIT 1",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, quote_id: Key) -> Result<interop::Quote> {
    pg::one_from::<Quote, interop::Quote>(
        db_pool,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = $1 and id = $2 and kind = 'quote'",
        &[&user_id, &quote_id],
    )
    .await
}

pub(crate) async fn next(db_pool: &Pool, user_id: Key, quote_id: Key) -> Result<interop::Quote> {
    let res = pg::quietly_one_from::<Quote, interop::Quote>(
        db_pool,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = $1 and id > $2 and kind = 'quote'
         ORDER BY id
         LIMIT 1",
        &[&user_id, &quote_id],
    )
    .await;

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            pg::one_from::<Quote, interop::Quote>(
                db_pool,
                "SELECT decks.id, decks.name, quote_extras.attribution
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = $1 and kind = 'quote'
                 ORDER BY id
                 LIMIT 1",
                &[&user_id],
            )
            .await
        }
        Err(e) => Err(e),
    }
}

pub(crate) async fn prev(db_pool: &Pool, user_id: Key, quote_id: Key) -> Result<interop::Quote> {
    let res = pg::quietly_one_from::<Quote, interop::Quote>(
        db_pool,
        "SELECT decks.id, decks.name, quote_extras.attribution
         FROM decks left join quote_extras on quote_extras.deck_id = decks.id
         WHERE user_id = $1 and id < $2 and kind = 'quote'
         ORDER BY id desc
         LIMIT 1",
        &[&user_id, &quote_id],
    )
    .await;

    match res {
        Ok(_) => res,
        Err(Error::NotFound) => {
            // wrap around and get the first quote
            pg::one_from::<Quote, interop::Quote>(
                db_pool,
                "SELECT decks.id, decks.name, quote_extras.attribution
                 FROM decks left join quote_extras on quote_extras.deck_id = decks.id
                 WHERE user_id = $1 and kind = 'quote'
                 ORDER BY id desc
                 LIMIT 1",
                &[&user_id],
            )
            .await
        }
        Err(e) => Err(e),
    }
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    quote: &interop::ProtoQuote,
    quote_id: Key,
) -> Result<interop::Quote> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        quote_id,
        DeckKind::Quote,
        &quote.title,
        graph_terminator,
    )
    .await?;

    let quote_extras_exists = pg::many::<QuoteExtra>(
        &tx,
        "select deck_id, attribution
         from quote_extras
         where deck_id=$1",
        &[&quote_id],
    )
    .await?;

    let sql_query: &str = match quote_extras_exists.len() {
        0 => {
            "INSERT INTO quote_extras(deck_id, attribution)
              VALUES ($1, $2)
              RETURNING $table_fields"
        }
        1 => {
            "UPDATE quote_extras
              SET attribution = $2
              WHERE deck_id = $1
              RETURNING $table_fields"
        }
        _ => {
            // should be impossible to get here since deck_id
            // is a primary key in the quote_extras table
            error!("multiple quote_extras entries for quote: {}", &quote_id);
            return Err(Error::TooManyFound);
        }
    };

    let quote_extras =
        pg::one::<QuoteExtra>(&tx, sql_query, &[&quote_id, &quote.attribution]).await?;

    tx.commit().await?;

    Ok((edited_deck, quote_extras).into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, quote_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, quote_id).await
}
