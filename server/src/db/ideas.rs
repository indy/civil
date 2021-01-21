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
use crate::interop::ideas as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct Idea {
    id: Key,
    name: String,
    graph_terminator: bool,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<Idea> for interop::Idea {
    fn from(a: Idea) -> interop::Idea {
        interop::Idea {
            id: a.id,
            title: a.name,

            graph_terminator: a.graph_terminator,

            created_at: a.created_at,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

impl From<decks::DeckBase> for interop::Idea {
    fn from(deck: decks::DeckBase) -> interop::Idea {
        interop::Idea {
            id: deck.id,
            title: deck.name,

            graph_terminator: deck.graph_terminator,

            created_at: deck.created_at,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,
        }
    }
}

pub(crate) async fn create_idea_tx(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_name: &str,
) -> Result<interop::Idea> {
    let deck = decks::deckbase_create(&tx, user_id, DeckKind::Idea, deck_name).await?;
    Ok(deck.into())
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Idea>> {
    pg::many_from::<Idea, interop::Idea>(
        db_pool,
        "SELECT id, name, created_at, graph_terminator
         FROM decks
         WHERE user_id = $1 and kind = 'idea'
         ORDER BY name",
        &[&user_id],
    )
    .await
}

pub(crate) async fn listings(db_pool: &Pool, user_id: Key) -> Result<interop::IdeasListings> {
    async fn many_from(db_pool: &Pool, user_id: Key, query: &str) -> Result<Vec<interop::Idea>> {
        pg::many_from::<Idea, interop::Idea>(db_pool, query, &[&user_id]).await
    }

    let (recent, orphans, unnoted, all) = tokio::try_join!(
        many_from(
            db_pool,
            user_id,
            "select id, name, created_at, graph_terminator
             from decks
             where user_id = $1 and kind = 'idea'
             order by created_at desc
             limit 20"
        ),
        many_from(
            db_pool,
            user_id,
            "select id, name, created_at, graph_terminator
             from decks
             where id not in (select deck_id
                              from notes_decks
                              group by deck_id)
             and id not in (select n.deck_id
                            from notes n inner join notes_decks nd on n.id = nd.note_id
                            group by n.deck_id)
             and kind = 'idea'
             and user_id = $1
             order by created_at desc"
        ),
        many_from(
            db_pool,
            user_id,
            "select d.id, d.name, d.created_at, d.graph_terminator
             from decks d left join notes n on d.id = n.deck_id
             where n.deck_id is null
                   and d.kind='idea'
                   and d.user_id=$1
             order by d.created_at desc"
        ),
        many_from(
            db_pool,
            user_id,
            "SELECT id, name, created_at, graph_terminator
                   FROM decks
                   WHERE user_id = $1 and kind = 'idea'
                   ORDER BY name"
        ),
    )?;

    Ok(interop::IdeasListings {
        recent,
        orphans,
        unnoted,
        all,
    })
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<interop::Idea> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_get(&tx, user_id, idea_id, DeckKind::Idea).await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn create(db_pool: &Pool, user_id: Key, title: &str) -> Result<interop::Idea> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_create(&tx, user_id, DeckKind::Idea, &title).await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    idea: &interop::ProtoIdea,
    idea_id: Key,
) -> Result<interop::Idea> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        idea_id,
        DeckKind::Idea,
        &idea.title,
        idea.graph_terminator,
    )
    .await?;

    tx.commit().await?;

    Ok(deck.into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, idea_id).await
}
