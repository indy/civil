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
use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::db::idea_kind::IdeaKind;
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
    idea_category: IdeaKind,
    graph_terminator: bool,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<Idea> for interop::Idea {
    fn from(a: Idea) -> interop::Idea {
        interop::Idea {
            id: a.id,
            title: a.name,

            idea_category: a.idea_category.into(),
            graph_terminator: a.graph_terminator,

            created_at: a.created_at,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,

            search_results: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "idea_extras")]
struct IdeaExtra {
    deck_id: Key,
    idea_category: IdeaKind,
}

impl From<(decks::DeckBase, IdeaExtra)> for interop::Idea {
    fn from(a: (decks::DeckBase, IdeaExtra)) -> interop::Idea {
        let (deck, extra) = a;
        interop::Idea {
            id: deck.id,
            title: deck.name,

            idea_category: extra.idea_category.into(),
            graph_terminator: deck.graph_terminator,

            created_at: deck.created_at,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,

            search_results: None,
        }
    }
}

pub(crate) async fn create_idea_tx(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_name: &str,
) -> Result<interop::Idea> {
    let deck = decks::deckbase_create(&tx, user_id, DeckKind::Idea, deck_name).await?;

    let idea_category = IdeaKind::Insight;
    let idea_extra = pg::one::<IdeaExtra>(
        tx,
        "INSERT INTO idea_extras(deck_id, idea_category)
         VALUES ($1, $2)
         RETURNING $table_fields",
        &[&deck.id, &idea_category],
    )
    .await?;

    Ok((deck, idea_extra).into())
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Idea>> {
    pg::many_from::<Idea, interop::Idea>(
        db_pool,
        "SELECT decks.id, decks.name, decks.created_at, decks.graph_terminator, idea_extras.idea_category
         FROM decks left join idea_extras on idea_extras.deck_id = decks.id
         WHERE user_id = $1 and kind = 'idea'
         ORDER BY name",
        &[&user_id])
        .await
}

pub(crate) async fn listings(db_pool: &Pool, user_id: Key) -> Result<interop::IdeasListings> {
    async fn many_from(db_pool: &Pool, user_id: Key, query: &str) -> Result<Vec<interop::Idea>> {
        pg::many_from::<Idea, interop::Idea>(db_pool, query, &[&user_id]).await
    }

    let (recent, orphans, all) = tokio::try_join!(
        many_from(
            db_pool,
            user_id,
            "select d.id, d.name, d.created_at, d.graph_terminator, ie.idea_category
             from decks d left join idea_extras ie on ie.deck_id=d.id
             where d.user_id = $1 and d.kind = 'idea'
             order by d.created_at desc
             limit 20"
        ),
        many_from(
            db_pool,
            user_id,
            "select d.id, d.name, d.created_at, d.graph_terminator, ie.idea_category
             from decks d left join idea_extras ie on ie.deck_id=d.id
             where d.id not in (select deck_id
                                from notes_decks
                                group by deck_id)
             and d.id not in (select n.deck_id
                              from notes n inner join notes_decks nd on n.id = nd.note_id
                              group by n.deck_id)
             and d.kind = 'idea'
             and d.user_id = $1
             order by d.created_at desc"
        ),
        many_from(db_pool,
                  user_id,
                  "SELECT decks.id, decks.name, decks.created_at, decks.graph_terminator, idea_extras.idea_category
                   FROM decks left join idea_extras on idea_extras.deck_id = decks.id
                   WHERE user_id = $1 and kind = 'idea'
                   ORDER BY name"),
    )?;

    Ok(interop::IdeasListings {
        recent,
        orphans,
        all,
    })
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<interop::Idea> {
    pg::one_from::<Idea, interop::Idea>(
        db_pool,
        "SELECT decks.id, decks.name, decks.created_at, decks.graph_terminator, idea_extras.idea_category
         FROM decks left join idea_extras on idea_extras.deck_id = decks.id
         WHERE user_id = $1 and id = $2 and kind = 'idea'",
        &[&user_id, &idea_id],
    )
    .await
}

pub(crate) async fn create(db_pool: &Pool, user_id: Key, title: &str) -> Result<interop::Idea> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_create(&tx, user_id, DeckKind::Idea, &title).await?;

    let idea_extra = pg::one::<IdeaExtra>(
        &tx,
        "INSERT INTO idea_extras(deck_id, idea_category)
         VALUES ($1, $2)
         RETURNING $table_fields",
        &[&deck.id, &IdeaKind::Verbatim],
    )
    .await?;

    tx.commit().await?;

    Ok((deck, idea_extra).into())
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

    let idea_category: IdeaKind = idea.idea_category.into();
    let idea_extra = pg::one::<IdeaExtra>(
        &tx,
        "UPDATE idea_extras
         SET idea_category = $2
         WHERE deck_id = $1
         RETURNING $table_fields",
        &[&idea_id, &idea_category],
    )
    .await?;

    tx.commit().await?;

    Ok((deck, idea_extra).into())
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, idea_id).await
}
