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

use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::decks as interop_decks;
use crate::interop::sr as interop;
use crate::interop::Key;

use rusqlite::{params, Row};
use std::str::FromStr;
#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone)]
pub struct Card {
    pub id: Key,

    pub note_id: Key,
    pub prompt: String,
}

impl From<(Card, interop_decks::DeckSimple)> for interop::Card {
    fn from(e: (Card, interop_decks::DeckSimple)) -> interop::Card {
        let (c, backref) = e;

        interop::Card {
            id: c.id,
            note_id: c.note_id,
            note_content: "???".to_string(),
            deck_info: backref,
            prompt: c.prompt,
        }
    }
}

fn flashcard_from_row(row: &Row) -> Result<interop::FlashCard> {
    Ok(interop::FlashCard {
        id: row.get(0)?,

        note_id: row.get(1)?,
        prompt: row.get(2)?,
        next_test_date: row.get(3)?,

        easiness_factor: row.get(4)?,
        inter_repetition_interval: row.get(5)?,
    })
}

pub(crate) fn all_flashcards_for_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> Result<Vec<interop::FlashCard>> {
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
        prompt: row.get(2)?,
    })
}

fn local_decksimple_from_row(row: &Row) -> Result<interop_decks::DeckSimple> {
    let kind: String = row.get(2)?;

    Ok(interop_decks::DeckSimple {
        id: row.get(0)?,
        name: row.get(1)?,
        resource: interop_decks::DeckKind::from_str(&kind)?,
    })
}

pub(crate) fn create_card(
    sqlite_pool: &SqlitePool,
    card: &interop::ProtoCard,
    user_id: Key,
) -> Result<interop::Card> {
    info!("create_card");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let easiness_factor: f32 = 2.5;
    let inter_repetition_interval: i32 = 1;

    let db_card = sqlite::one(
        &tx,
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
        &tx,
        "SELECT d.id, d.name, d.kind
         FROM decks d, notes n
         WHERE d.id = n.deck_id AND n.id = ?1",
        params![&card.note_id],
        local_decksimple_from_row,
    )?;

    tx.commit()?;

    Ok((db_card, db_backref).into())
}

pub(crate) fn get_card_full_fat(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    card_id: Key,
) -> Result<interop::FlashCard> {
    info!("get_card_full_fat");

    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT id, note_id, prompt, next_test_date, easiness_factor, inter_repetition_interval
         FROM cards
         WHERE user_id=?1 and id=?2",
        params![&user_id, &card_id],
        flashcard_from_row,
    )
}

pub(crate) fn card_rated(
    sqlite_pool: &SqlitePool,
    card: interop::FlashCard,
    rating: i16,
) -> Result<()> {
    info!("card_rated");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    sqlite::zero(
        &tx,
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
        &tx,
        "INSERT INTO card_ratings(card_id, rating)
         VALUES (?1, ?2)",
        params![&card.id, &rating],
    )?;

    tx.commit()?;

    Ok(())
}

pub(crate) fn edit_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard: &interop::FlashCard,
    flashcard_id: Key,
) -> Result<interop::FlashCard> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "UPDATE cards
         SET prompt = ?3
         WHERE id = ?2 and user_id = ?1
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, inter_repetition_interval",
        params![&user_id, &flashcard_id, &flashcard.prompt],
        flashcard_from_row,
    )
}

pub(crate) fn delete_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard_id: Key,
) -> Result<()> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    sqlite::zero(
        &tx,
        "DELETE FROM card_ratings WHERE card_id = ?1",
        params![&flashcard_id],
    )?;

    sqlite::zero(
        &tx,
        "DELETE FROM cards WHERE id = ?1 AND user_id = ?2",
        params![&flashcard_id, &user_id],
    )?;

    tx.commit()?;

    Ok(())
}

fn interop_card_from_row(row: &Row) -> Result<interop::Card> {
    let kind: String = row.get(6)?;

    Ok(interop::Card {
        id: row.get(0)?,
        note_id: row.get(1)?,
        note_content: row.get(3)?,
        deck_info: interop_decks::DeckSimple {
            id: row.get(4)?,
            name: row.get(5)?,
            resource: interop_decks::DeckKind::from_str(&kind)?,
        },
        prompt: row.get(2)?,
    })
}

pub(crate) fn get_cards(
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

pub(crate) fn get_practice_card(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::Card> {
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

pub(crate) fn get_cards_upcoming_review(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> Result<interop::CardUpcomingReview> {
    info!("get_cards_upcoming_review");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    fn i32_from_row(row: &Row) -> Result<i32> {
        Ok(row.get(0)?)
    }

    fn naive_datetime_from_row(row: &Row) -> Result<chrono::NaiveDateTime> {
        Ok(row.get(0)?)
    }

    let review_count = sqlite::one(
        &tx,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = ?1 and next_test_date < ?2",
        params![&user_id, &due],
        i32_from_row,
    )?;

    let earliest_review_date = sqlite::one(
        &tx,
        "SELECT MIN(next_test_date) as earliest_review_date
         FROM cards
         WHERE user_id = ?1
         GROUP BY user_id",
        params![&user_id],
        naive_datetime_from_row,
    )?;

    tx.commit()?;

    Ok(interop::CardUpcomingReview {
        review_count,
        earliest_review_date,
    })
}
