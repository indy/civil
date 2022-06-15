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

use crate::db::deck_kind::{DeckKind, deck_kind_from_sqlite_string};
use crate::db::decks::DeckSimple;
use crate::error::Result;
use crate::interop::decks as interop_decks;
use crate::interop::sr as interop;
use crate::interop::Key;
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

    pub note_content: String,

    pub deck_id: Key,
    pub deck_name: String,
    pub deck_kind: DeckKind,
}

impl From<CardDbInternal> for interop::Card {
    fn from(e: CardDbInternal) -> interop::Card {
        interop::Card {
            id: e.id,
            note_id: e.note_id,
            note_content: e.note_content,
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
            note_content: "???".to_string(),
            deck_info: backref,
            prompt: c.prompt,
        }
    }
}


use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Row, params};

fn flashcard_from_row(row: &Row) -> Result<interop::SqliteFlashCard> {
    Ok(interop::SqliteFlashCard {
        id: row.get(0)?,

        note_id: row.get(1)?,
        prompt: row.get(2)?,
        next_test_date: row.get(3)?,

        easiness_factor: row.get(4)?,
        inter_repetition_interval: row.get(5)?,
    })
}

pub(crate) fn sqlite_all_flashcards_for_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> Result<Vec<interop::SqliteFlashCard>> {
    let conn = sqlite_pool.get()?;
    sqlite::many(&conn,
                 "SELECT c.id, c.note_id, c.prompt, c.next_test_date, c.easiness_factor, c.inter_repetition_interval
                  FROM cards c, decks d, notes n
                  WHERE d.id=?1 AND n.deck_id = d.id AND c.note_id = n.id",
                 params![&deck_id],
                 flashcard_from_row)
}


fn local_card_from_row(row: &Row) -> Result<Card> {
    Ok(Card {
        id: row.get(0)?,
        note_id: row.get(1)?,
        prompt: row.get(2)?
    })
}



fn local_decksimple_from_row(row: &Row) -> Result<DeckSimple> {
    let kind: String = row.get(2)?;
    let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;
    Ok(DeckSimple {
        id: row.get(0)?,
        name: row.get(1)?,
        kind: deck_kind
    })
}



pub(crate) fn sqlite_create_card(
    sqlite_pool: &SqlitePool,
    card: &interop::ProtoCard,
    user_id: Key,
) -> Result<interop::Card> {
    info!("create_card");

    let conn = sqlite_pool.get()?;

    let easiness_factor: f32 = 2.5;
    let inter_repetition_interval: i32 = 1;

    let db_card = sqlite::one(
        &conn,
        "INSERT INTO cards(user_id, note_id, prompt, easiness_factor, inter_repetition_interval)
         VALUES (?1, ?2, ?3, ?4, ?5)
         RETURNING id, note_id, prompt",
        params![
            &user_id,
            &card.note_id,
            &card.prompt,
            &easiness_factor,
            &inter_repetition_interval,
        ],
        local_card_from_row,
    )?;

    let db_backref = sqlite::one(
        &conn,
        "SELECT d.id, d.name, d.kind
         FROM decks d, notes n
         WHERE d.id = n.deck_id AND n.id = ?1",
        params![&card.note_id],
        local_decksimple_from_row
    )?;

    Ok((db_card, db_backref).into())
}

pub(crate) fn sqlite_get_card_full_fat(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    card_id: Key,
) -> Result<interop::SqliteFlashCard> {
    info!("get_card_full_fat");

    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT id, note_id, prompt, next_test_date, easiness_factor, inter_repetition_interval
         FROM cards
         WHERE user_id=?1 and id=?2",
        params![&user_id, &card_id],
        flashcard_from_row
    )
}

pub(crate) fn sqlite_card_rated(
    sqlite_pool: &SqlitePool,
    card: interop::SqliteFlashCard,
    rating: i16,
) -> Result<()> {
    info!("card_rated");

    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "UPDATE cards
         SET next_test_date = ?2, easiness_factor = ?3, inter_repetition_interval = ?4
         WHERE id = ?1",
        params![
            &card.id,
            &card.next_test_date,
            &card.easiness_factor,
            &card.inter_repetition_interval,
        ],
    )?;

    sqlite::zero(
        &conn,
        "INSERT INTO card_ratings(card_id, rating)
         VALUES (?1, ?2)",
        params![&card.id, &rating],
    )?;

    Ok(())
}

pub(crate) fn sqlite_edit_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard: &interop::SqliteFlashCard,
    flashcard_id: Key,
) -> Result<interop::SqliteFlashCard> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "UPDATE cards
         SET prompt = ?3
         WHERE id = ?2 and user_id = ?1
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, inter_repetition_interval",
        params![&user_id, &flashcard_id, &flashcard.prompt],
        flashcard_from_row
    )
}

pub(crate) fn sqlite_delete_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard_id: Key,
) -> Result<()> {

    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "DELETE FROM card_ratings WHERE card_id = ?1",
        params![&flashcard_id],
    )?;

    sqlite::zero(
        &conn,
        "DELETE FROM cards WHERE id = ?1 AND user_id = ?2",
        params![&flashcard_id, &user_id],
    )?;

    Ok(())
}


fn interop_card_from_row(row: &Row) -> Result<interop::Card> {
    let kind: String = row.get(6)?;
    let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;

    Ok(interop::Card {
        id: row.get(0)?,
        note_id: row.get(1)?,
        note_content: row.get(3)?,
        deck_info: interop_decks::DeckSimple {
            id: row.get(4)?,
            name: row.get(5)?,
            resource: interop_decks::DeckResource::from(deck_kind),
        },
        prompt: row.get(2)?,
    })
}

pub(crate) fn sqlite_get_cards(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> Result<Vec<interop::Card>> {
    info!("get_cards");

    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, n.content, d.id AS deck_id, d.name AS deck_name, d.kind AS deck_kind
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id and c.user_id = ?1 and c.next_test_date < ?2",
        params![&user_id, &due],
        interop_card_from_row
    )
}

pub(crate) fn sqlite_get_practice_card(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::Card> {
    info!("get_practice_card");

    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, n.content, d.id AS deck_id, d.name AS deck_name, d.kind AS deck_kind
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id and c.user_id = ?1
         ORDER BY random()
         LIMIT 1",
        params![&user_id],
        interop_card_from_row
    )
}


pub(crate) fn sqlite_get_cards_upcoming_review(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> Result<interop::SqliteCardUpcomingReview> {
    info!("get_cards_upcoming_review");

    let conn = sqlite_pool.get()?;


    fn i32_from_row(row: &Row) -> Result<i32> {
        Ok(row.get(0)?)
    }

    fn naive_datetime_from_row(row: &Row) -> Result<chrono::NaiveDateTime> {
        Ok(row.get(0)?)
    }

    let review_count = sqlite::one(
        &conn,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = ?1 and next_test_date < ?2",
        params![&user_id, &due],
        i32_from_row
    )?;

    let earliest_review_date = sqlite::one(
        &conn,
        "SELECT MIN(next_test_date) as earliest_review_date
         FROM cards
         WHERE user_id = ?1
         GROUP BY user_id",
        params![&user_id],
        naive_datetime_from_row
    )?;

    Ok(interop::SqliteCardUpcomingReview {
        review_count,
        earliest_review_date
    })
}
