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
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<Idea> for interop::Idea {
    fn from(a: Idea) -> interop::Idea {
        interop::Idea {
            id: a.id,
            title: a.name,

            idea_category: a.idea_category.into(),

            created_at: a.created_at,

            notes: None,

            decks_in_notes: None,
            linkbacks_to_decks: None,

            search_results: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct IdeaWithoutCategory {
    id: Key,
    name: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<IdeaWithoutCategory> for interop::Idea {
    fn from(a: IdeaWithoutCategory) -> interop::Idea {
        interop::Idea {
            id: a.id,
            title: a.name,

            idea_category: interop::IdeaKind::Verbatim,

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

pub(crate) async fn create_idea_tx(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_name: &str,
) -> Result<interop::Idea> {
    let deck = pg::one::<IdeaWithoutCategory>(
        tx,
        include_str!("sql/ideas_create.sql"),
        &[&user_id, &deck_name],
    ).await?;

    let mut created_idea: interop::Idea = deck.into();

    let idea_category = IdeaKind::Insight;
    let idea_extras = pg::one::<IdeaExtra>(
        tx,
        include_str!("sql/ideas_create_extra.sql"),
        &[&created_idea.id, &idea_category],
    ).await?;

    created_idea.idea_category = interop::IdeaKind::from(idea_extras.idea_category);

    Ok(created_idea)
}

pub(crate) async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Idea>> {
    pg::many_from::<Idea, interop::Idea>(db_pool, include_str!("sql/ideas_all.sql"), &[&user_id])
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
            include_str!("sql/ideas_listing_recent.sql")
        ),
        many_from(
            db_pool,
            user_id,
            include_str!("sql/ideas_listing_orphans.sql")
        ),
        many_from(db_pool, user_id, include_str!("sql/ideas_all.sql")),
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
        include_str!("sql/ideas_get.sql"),
        &[&user_id, &idea_id],
    )
    .await
}

pub(crate) async fn create(
    db_pool: &Pool,
    user_id: Key,
    idea: &interop::ProtoIdea,
) -> Result<interop::Idea> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = pg::one::<IdeaWithoutCategory>(
        &tx,
        include_str!("sql/ideas_create.sql"),
        &[&user_id, &idea.title],
    ).await?;

    let mut created_idea: interop::Idea = deck.into();

    let idea_category: IdeaKind = IdeaKind::from(idea.idea_category);

    let idea_extras = pg::one::<IdeaExtra>(
        &tx,
        include_str!("sql/ideas_create_extra.sql"),
        &[&created_idea.id, &idea_category],
    ).await?;

    created_idea.idea_category = interop::IdeaKind::from(idea_extras.idea_category);

    tx.commit().await?;

    Ok(created_idea)
}

pub(crate) async fn edit(
    db_pool: &Pool,
    user_id: Key,
    idea: &interop::ProtoIdea,
    idea_id: Key,
) -> Result<interop::Idea> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let edited_deck = pg::one::<IdeaWithoutCategory>(
        &tx,
        include_str!("sql/ideas_edit.sql"),
        &[&user_id, &idea_id, &idea.title],
    )
    .await?;

    let mut edited_idea: interop::Idea = edited_deck.into();

    let idea_category: IdeaKind = idea.idea_category.into();

    let idea_extras = pg::one::<IdeaExtra>(
        &tx,
        include_str!("sql/ideas_edit_extra.sql"),
        &[&idea_id, &idea_category],
    )
    .await?;

    info!("{:?}", &idea_extras);

    edited_idea.idea_category = idea_extras.idea_category.into();



    tx.commit().await?;

    info!("{:?}", &edited_idea);

    Ok(edited_idea)
}

pub(crate) async fn delete(db_pool: &Pool, user_id: Key, idea_id: Key) -> Result<()> {
    decks::delete(db_pool, user_id, idea_id).await
}
