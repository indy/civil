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
use crate::db::decks::LinkBackToDeck;
use crate::error::{Error, Result};
use crate::interop::decks as interop_decks;
use crate::interop::sr as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "cards")]
pub struct CardInternal {
    pub id: Key,

    pub note_id: Key,
    pub prompt: String,
    pub next_test_date: chrono::DateTime<chrono::Utc>,

    pub repetition_number: f32,
    pub easiness_factor: f32,
    pub inter_repetition_interval: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "cards")]
pub struct Card {
    pub id: Key,

    pub note_id: Key,
    pub prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "cards")]
pub struct CardFullFat {
    pub id: Key,
    pub note_id: Key,
    pub prompt: String,

    pub deck_id: Key,
    pub deck_name: String,
    pub deck_kind: DeckKind,
}

impl From<CardFullFat> for interop::Card {
    fn from(e: CardFullFat) -> interop::Card {
        interop::Card {
            id: e.id,
            note_id: e.note_id,
            deck_info: interop_decks::LinkBack {
                id: e.deck_id,
                name: e.deck_name,
                resource: interop_decks::DeckResource::from(e.deck_kind),
            },
            prompt: e.prompt,
        }
    }
}

impl From<(Card, LinkBackToDeck)> for interop::Card {
    fn from(e: (Card, LinkBackToDeck)) -> interop::Card {
        let (c, lb) = e;

        // todo: inline
        let linkback: interop_decks::LinkBack = lb.into();

        interop::Card {
            id: c.id,
            note_id: c.note_id,
            deck_info: linkback,
            prompt: c.prompt,
        }
    }
}

pub(crate) async fn create_card(
    db_pool: &Pool,
    card: &interop::ProtoCard,
    user_id: Key,
) -> Result<interop::Card> {
    info!("create_card");

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let repetition_number: f32 = 1.0;
    let easiness_factor: f32 = 2.0;
    let inter_repetition_interval: f32 = 3.0;

    let db_card = pg::one::<Card>(
        &tx,
        "INSERT INTO cards(user_id, note_id, prompt, repetition_number, easiness_factor, inter_repetition_interval)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING $table_fields",
        &[
            &user_id,
            &card.note_id,
            &card.prompt,
            &repetition_number,
            &easiness_factor,
            &inter_repetition_interval,
        ],
    ).await?;

    let db_linkback = pg::one::<LinkBackToDeck>(
        &tx,
        "SELECT d.id AS id, d.name AS name, d.kind AS kind
         FROM decks d, notes n
         WHERE d.id = n.deck_id AND n.id = $1",
        &[&card.note_id],
    )
    .await?;

    tx.commit().await?;

    Ok((db_card, db_linkback).into())
}

pub(crate) async fn get_cards(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Card>> {
    info!("get_evaluation_cards");

    pg::many_from::<CardFullFat, interop::Card>(
        db_pool,
        "SELECT c.id, c.note_id, c.prompt, d.id as deck_id, d.name AS deck_name, d.kind AS deck_kind
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id and c.user_id = $1",
        &[&user_id]
    )
    .await
}

// #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
// #[pg_mapper(table = "card_evaluations")]
// pub struct CardEvaluations {
//     pub card_id: Key,
//     pub rating: i16,
// }

pub(crate) async fn card_rating(
    db_pool: &Pool,
    card_id: Key,
    rating: &interop::ProtoRating,
) -> Result<()> {
    info!("create_card_evaluation");

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;
    pg::zero(
        &tx,
        "INSERT INTO card_evaluations(card_id, rating)
         VALUES ($1, $2)",
        &[&card_id, &rating.rating],
    )
    .await?;
    tx.commit().await?;

    Ok(())
}
