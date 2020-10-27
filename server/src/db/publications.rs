// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

// part of a publication, using only values from the decks table
//
#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct PublicationDeck {
    id: Key,
    name: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "publication_extras")]
struct PublicationExtra {
    deck_id: Key,
    source: Option<String>,
    author: Option<String>,
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Publication>> {
    pg::many_from::<Publication, interop::Publication>(
        db_pool,
        include_str!("sql/publications_all.sql"),
        &[&user_id],
    )
    .await
}

pub(crate) async fn get(
    db_pool: &Pool,
    user_id: Key,
    publication_id: Key,
) -> Result<interop::Publication> {
    pg::one_from::<Publication, interop::Publication>(
        db_pool,
        include_str!("sql/publications_get.sql"),
        &[&user_id, &publication_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    publication: &interop::ProtoPublication,
) -> Result<interop::Publication> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = pg::one::<PublicationDeck>(
        &tx,
        include_str!("sql/publications_create.sql"),
        &[&user_id, &publication.title],
    )
    .await?;

    let mut created_publication = interop::Publication {
        id: deck.id,
        title: deck.name,

        created_at: deck.created_at,

        source: None,
        author: None,

        notes: None,

        decks_in_notes: None,
        linkbacks_to_decks: None,
    };

    dbg!("{:?}", publication);
    if publication.source.is_some() || publication.author.is_some() {
        let publication_extras = pg::one::<PublicationExtra>(
            &tx,
            include_str!("sql/publications_create_extra.sql"),
            &[&deck.id, &publication.source, &publication.author],
        )
        .await?;

        created_publication.source = publication_extras.source;
        created_publication.author = publication_extras.author;
    }

    tx.commit().await?;

    Ok(created_publication)
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    publication: &interop::ProtoPublication,
    publication_id: Key,
) -> Result<interop::Publication> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let edited_deck = pg::one::<PublicationDeck>(
        &tx,
        include_str!("sql/publications_edit.sql"),
        &[&user_id, &publication_id, &publication.title],
    )
    .await?;

    let mut edited_publication = interop::Publication {
        id: edited_deck.id,
        title: edited_deck.name,

        created_at: edited_deck.created_at,

        source: None,
        author: None,

        notes: None,

        decks_in_notes: None,
        linkbacks_to_decks: None,
    };

    let publication_extras_exists = pg::many::<PublicationExtra>(
        &tx,
        include_str!("sql/publication_extras_exists.sql"),
        &[&publication_id],
    )
    .await?;

    let sql_query: &str = match publication_extras_exists.len() {
        0 => include_str!("sql/publications_create_extra.sql"),
        1 => include_str!("sql/publications_edit_extra.sql"),
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
        &[&publication_id, &publication.source, &publication.author],
    )
    .await?;

    edited_publication.source = publication_extras.source;
    edited_publication.author = publication_extras.author;

    tx.commit().await?;

    Ok(edited_publication)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, publication_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, publication_id).await
}
