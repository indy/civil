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
use crate::db::decks::DeckSimple;
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
pub struct FlashCard {
    pub id: Key,

    pub note_id: Key,
    pub prompt: String,
    pub next_test_date: chrono::DateTime<chrono::Utc>,

    pub easiness_factor: f32,
    pub inter_repetition_interval: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "cards")]
pub struct CardUpcomingReviewCount {
    pub review_count: i64, // note with postgres' Int8 the '8' refers to bytes not bits
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "cards")]
pub struct CardUpcomingReviewDate {
    pub earliest_review_date: chrono::DateTime<chrono::Utc>,
}

impl From<(CardUpcomingReviewCount, CardUpcomingReviewDate)> for interop::CardUpcomingReview {
    fn from(cc: (CardUpcomingReviewCount, CardUpcomingReviewDate)) -> interop::CardUpcomingReview {
        let (c, d) = cc;
        interop::CardUpcomingReview {
            review_count: c.review_count as i32,
            earliest_review_date: d.earliest_review_date,
        }
    }
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
pub struct CardDbInternal {
    pub id: Key,
    pub note_id: Key,
    pub prompt: String,

    pub deck_id: Key,
    pub deck_name: String,
    pub deck_kind: DeckKind,
}

impl From<CardDbInternal> for interop::Card {
    fn from(e: CardDbInternal) -> interop::Card {
        interop::Card {
            id: e.id,
            note_id: e.note_id,
            deck_info: interop_decks::DeckSimple {
                id: e.deck_id,
                name: e.deck_name,
                resource: interop_decks::DeckResource::from(e.deck_kind),
            },
            prompt: e.prompt,
        }
    }
}

impl From<FlashCard> for interop::FlashCard {
    fn from(e: FlashCard) -> interop::FlashCard {
        interop::FlashCard {
            id: e.id,
            note_id: e.note_id,
            prompt: e.prompt,
            next_test_date: e.next_test_date,
            easiness_factor: e.easiness_factor,
            inter_repetition_interval: e.inter_repetition_interval,
        }
    }
}

impl From<(Card, DeckSimple)> for interop::Card {
    fn from(e: (Card, DeckSimple)) -> interop::Card {
        let (c, lb) = e;

        // todo: inline
        let backref: interop_decks::DeckSimple = lb.into();

        interop::Card {
            id: c.id,
            note_id: c.note_id,
            deck_info: backref,
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

    let easiness_factor: f32 = 2.5;
    let inter_repetition_interval: i32 = 1;

    let db_card = pg::one::<Card>(
        &tx,
        "INSERT INTO cards(user_id, note_id, prompt, easiness_factor, inter_repetition_interval)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING $table_fields",
        &[
            &user_id,
            &card.note_id,
            &card.prompt,
            &easiness_factor,
            &inter_repetition_interval,
        ],
    )
    .await?;

    let db_backref = pg::one::<DeckSimple>(
        &tx,
        "SELECT d.id AS id, d.name AS name, d.kind AS kind
         FROM decks d, notes n
         WHERE d.id = n.deck_id AND n.id = $1",
        &[&card.note_id],
    )
    .await?;

    tx.commit().await?;

    Ok((db_card, db_backref).into())
}

pub(crate) async fn get_card_full_fat(
    db_pool: &Pool,
    user_id: Key,
    card_id: Key,
) -> Result<interop::FlashCard> {
    info!("get_card_full_fat");

    pg::one_from::<FlashCard, interop::FlashCard>(
        db_pool,
        "SELECT id, note_id, prompt, next_test_date, easiness_factor, inter_repetition_interval
         FROM cards
         WHERE user_id=$1 and id=$2",
        &[&user_id, &card_id],
    )
    .await
}

pub(crate) async fn get_cards(
    db_pool: &Pool,
    user_id: Key,
    due: chrono::DateTime<chrono::Utc>,
) -> Result<Vec<interop::Card>> {
    info!("get_cards");

    pg::many_from::<CardDbInternal, interop::Card>(
        db_pool,
        "SELECT c.id, c.note_id, c.prompt, d.id as deck_id, d.name AS deck_name, d.kind AS deck_kind
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id and c.user_id = $1 and c.next_test_date < $2",
        &[&user_id, &due]
    )
    .await
}

pub(crate) async fn get_cards_upcoming_review(
    db_pool: &Pool,
    user_id: Key,
    due: chrono::DateTime<chrono::Utc>,
) -> Result<interop::CardUpcomingReview> {
    info!("get_cards_upcoming_review");

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let review_count = pg::one::<CardUpcomingReviewCount>(
        &tx,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = $1 and next_test_date < $2",
        &[&user_id, &due],
    )
    .await?;

    let review_date = pg::one::<CardUpcomingReviewDate>(
        &tx,
        "SELECT MIN(next_test_date) as earliest_review_date
         FROM cards
         WHERE user_id = $1
         GROUP BY user_id",
        &[&user_id],
    )
    .await?;

    tx.commit().await?;

    Ok((review_count, review_date).into())
}

pub(crate) async fn card_rated(
    db_pool: &Pool,
    card: interop::FlashCard,
    rating: i16,
) -> Result<()> {
    info!("card_rated");

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        "UPDATE cards
         SET next_test_date = $2, easiness_factor = $3, inter_repetition_interval = $4
         WHERE id = $1",
        &[
            &card.id,
            &card.next_test_date,
            &card.easiness_factor,
            &card.inter_repetition_interval,
        ],
    )
    .await?;

    pg::zero(
        &tx,
        "INSERT INTO card_ratings(card_id, rating)
         VALUES ($1, $2)",
        &[&card.id, &rating],
    )
    .await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn all_flashcards_for_deck(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<interop::FlashCard>> {
    pg::many_from::<FlashCard, interop::FlashCard>(
        db_pool,
        "SELECT c.id, c.note_id, c.prompt, c.next_test_date, c.easiness_factor, c.inter_repetition_interval
         FROM cards c, decks d, notes n
         WHERE d.id=$1 AND n.deck_id = d.id AND c.note_id = n.id",
        &[&deck_id],
    )
    .await
}
