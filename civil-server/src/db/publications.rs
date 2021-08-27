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
use crate::error::{Error, Result};
use crate::interop::publications as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Publication {
    id: Key,
    name: String,
    source: Option<String>,
    author: Option<String>,
    short_description: Option<String>,
    rating: i32,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<Publication> for interop::Publication {
    fn from(a: Publication) -> interop::Publication {
        interop::Publication {
            id: a.id,
            title: a.name,

            created_at: a.created_at,

            source: a.source,
            author: a.author,
            short_description: a.short_description,

            rating: a.rating,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "publication_extras")]
struct PublicationExtra {
    deck_id: Key,
    source: Option<String>,
    author: Option<String>,
    short_description: Option<String>,
    rating: i32,
}

impl From<(decks::DeckBase, PublicationExtra)> for interop::Publication {
    fn from(a: (decks::DeckBase, PublicationExtra)) -> interop::Publication {
        let (deck, extra) = a;
        interop::Publication {
            id: deck.id,
            title: deck.name,

            created_at: deck.created_at,

            source: extra.source,
            author: extra.author,
            short_description: extra.short_description,

            rating: extra.rating,

            notes: None,

            refs: None,

            backnotes: None,
            backrefs: None,

            flashcards: None,
        }
    }
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Publication>> {
    pg::many_from::<Publication, interop::Publication>(
        db_pool,
        "SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, publication_extras.short_description, coalesce(publication_extras.rating, 0) as rating, decks.created_at
         FROM decks left join publication_extras on publication_extras.deck_id = decks.id
         WHERE user_id = $1 and kind = 'publication'
         ORDER BY created_at desc",
        &[&user_id],
    )
    .await
}

pub(crate) async fn listings(db_pool: &Pool, user_id: Key) -> Result<interop::PublicationListings> {
    async fn many_from(
        db_pool: &Pool,
        user_id: Key,
        query: &str,
    ) -> Result<Vec<interop::Publication>> {
        pg::many_from::<Publication, interop::Publication>(db_pool, query, &[&user_id]).await
    }

    let (recent, rated, orphans, all) = tokio::try_join!(
        many_from(
            db_pool,
            user_id,
            "SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, publication_extras.short_description, coalesce(publication_extras.rating, 0) as rating, decks.created_at
             FROM decks left join publication_extras on publication_extras.deck_id = decks.id
             WHERE user_id = $1 and kind = 'publication'
             ORDER BY created_at desc
             LIMIT 10",
        ),
        many_from(
            db_pool,
            user_id,
            "SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, publication_extras.short_description, coalesce(publication_extras.rating, 0) as rating, decks.created_at
             FROM decks left join publication_extras on publication_extras.deck_id = decks.id
             WHERE user_id = $1 and kind = 'publication' and publication_extras.rating > 0
             ORDER BY publication_extras.rating desc",
        ),
        many_from(
            db_pool,
            user_id,
            "SELECT d.id, d.name, pe.source, pe.author, pe.short_description, coalesce(pe.rating, 0) as rating, d.created_at
             FROM decks d left join publication_extras pe on pe.deck_id=d.id
             WHERE d.id not in (SELECT deck_id
                                FROM notes_decks
                                GROUP BY deck_id)
             AND d.id not in (SELECT n.deck_id
                              FROM notes n inner join notes_decks nd on n.id = nd.note_id
                              GROUP by n.deck_id)
             AND d.kind = 'publication'
             AND d.user_id = $1
             ORDER BY d.created_at desc",
        ),
        many_from(db_pool,
                  user_id,
                  "SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, publication_extras.short_description, coalesce(publication_extras.rating, 0) as rating, decks.created_at
                   FROM decks left join publication_extras on publication_extras.deck_id = decks.id
                   WHERE user_id = $1 and kind = 'publication'
                   ORDER BY created_at desc"
        ),
    )?;

    Ok(interop::PublicationListings {
        recent,
        rated,
        orphans,
        all,
    })
}

pub(crate) async fn get(
    db_pool: &Pool,
    user_id: Key,
    publication_id: Key,
) -> Result<interop::Publication> {
    pg::one_from::<Publication, interop::Publication>(
        db_pool,
        "SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, publication_extras.short_description, coalesce(publication_extras.rating, 0) as rating, decks.created_at
         FROM decks left join publication_extras on publication_extras.deck_id = decks.id
         WHERE user_id = $1 and id = $2 and kind = 'publication'",
        &[&user_id, &publication_id],
    )
    .await
}

pub(crate) async fn get_or_create(
    db_pool: &Pool,
    user_id: Key,
    title: &str,
) -> Result<interop::Publication> {
    let source = "";
    let author = "";
    let short_description = "";
    let rating = 0;

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;

    let tx = client.transaction().await?;

    let (deck, origin) =
        decks::deckbase_get_or_create(&tx, user_id, DeckKind::Publication, &title).await?;

    let publication_extras =
        match origin {
            decks::DeckBaseOrigin::Created => pg::one::<PublicationExtra>(
                &tx,
                "INSERT INTO publication_extras(deck_id, source, author, short_description, rating)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING $table_fields",
                &[&deck.id, &source, &author, &short_description, &rating],
            )
            .await?,
            decks::DeckBaseOrigin::PreExisting => {
                pg::one::<PublicationExtra>(
                    &tx,
                    "select deck_id, source, author, short_description, rating
                 from publication_extras
                 where deck_id=$1",
                    &[&deck.id],
                )
                .await?
            }
        };

    tx.commit().await?;

    Ok((deck, publication_extras).into())
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    publication: &interop::ProtoPublication,
    publication_id: Key,
) -> Result<interop::Publication> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let graph_terminator = false;
    let edited_deck = decks::deckbase_edit(
        &tx,
        user_id,
        publication_id,
        DeckKind::Publication,
        &publication.title,
        graph_terminator,
    )
    .await?;

    let publication_extras_exists = pg::many::<PublicationExtra>(
        &tx,
        "select deck_id, source, author, short_description, rating
         from publication_extras
         where deck_id=$1",
        &[&publication_id],
    )
    .await?;

    let sql_query: &str = match publication_extras_exists.len() {
        0 => {
            "INSERT INTO publication_extras(deck_id, source, author, short_description, rating)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING $table_fields"
        }
        1 => {
            "UPDATE publication_extras
              SET source = $2, author = $3, short_description = $4, rating = $5
              WHERE deck_id = $1
              RETURNING $table_fields"
        }
        _ => {
            // should be impossible to get here since deck_id
            // is a primary key in the publication_extras table
            error!(
                "multiple publication_extras entries for publication: {}",
                &publication_id
            );
            return Err(Error::TooManyFound);
        }
    };

    let publication_extras = pg::one::<PublicationExtra>(
        &tx,
        sql_query,
        &[
            &publication_id,
            &publication.source,
            &publication.author,
            &publication.short_description,
            &publication.rating,
        ],
    )
    .await?;

    tx.commit().await?;

    Ok((edited_deck, publication_extras).into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, publication_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, publication_id).await
}
