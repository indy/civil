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
use crate::interop::decks as interop_decks;
use crate::interop::font::Font;
use crate::interop::memorise as interop;
use crate::interop::Key;

use chrono::Utc;
use rusqlite::{params, Row};
use std::str::FromStr;
#[allow(unused_imports)]
use tracing::info;

impl From<(interop::FlashCard, interop_decks::SlimDeck)> for interop::Card {
    fn from(e: (interop::FlashCard, interop_decks::SlimDeck)) -> interop::Card {
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

fn flashcard_from_row(row: &Row) -> crate::Result<interop::FlashCard> {
    Ok(interop::FlashCard {
        id: row.get(0)?,

        note_id: row.get(1)?,
        prompt: row.get(2)?,
        next_test_date: row.get(3)?,

        easiness_factor: row.get(4)?,
        interval: row.get(5)?,
        repetition: row.get(6)?,
    })
}

pub(crate) fn all_flashcards_for_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<interop::FlashCard>> {
    let conn = sqlite_pool.get()?;
    sqlite::many(&conn,
                 "SELECT c.id, c.note_id, c.prompt, c.next_test_date, c.easiness_factor, c.interval, c.repetition
                  FROM cards c, decks d, notes n
                  WHERE d.id=?1 AND n.deck_id = d.id AND c.note_id = n.id",
                 params![&deck_id],
                 flashcard_from_row)
}

pub(crate) fn create_card(
    sqlite_pool: &SqlitePool,
    card: &interop::ProtoCard,
    user_id: Key,
) -> crate::Result<interop::FlashCard> {
    info!("create_card");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let easiness_factor: f32 = 2.5;
    let interval: i32 = 1;
    let repetition: i32 = 1;
    let next_test_date = Utc::now().naive_utc();

    let flashcard = sqlite::one(
        &tx,
        "INSERT INTO cards(user_id, note_id, prompt, next_test_date, easiness_factor, interval, repetition)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, interval, repetition",
        params![
            &user_id,
            &card.note_id,
            &card.prompt,
            &next_test_date,
            &easiness_factor,
            &interval,
            &repetition
        ],
        flashcard_from_row,
    )?;

    tx.commit()?;

    Ok(flashcard)
}

pub(crate) fn get_card_full_fat(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    card_id: Key,
) -> crate::Result<interop::FlashCard> {
    info!("get_card_full_fat");

    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT id, note_id, prompt, next_test_date, easiness_factor, interval, repetition
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
) -> crate::Result<()> {
    info!("card_rated");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    sqlite::zero(
        &tx,
        "UPDATE cards
         SET next_test_date = ?2, easiness_factor = ?3, interval = ?4, repetition = ?5
         WHERE id = ?1",
        params![
            &card.id,
            &card.next_test_date,
            &card.easiness_factor,
            &card.interval,
            &card.repetition,
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
) -> crate::Result<interop::FlashCard> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "UPDATE cards
         SET prompt = ?3
         WHERE id = ?2 and user_id = ?1
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, interval, repetition",
        params![&user_id, &flashcard_id, &flashcard.prompt],
        flashcard_from_row,
    )
}

pub(crate) fn delete_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard_id: Key,
) -> crate::Result<()> {
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

fn interop_card_from_row(row: &Row) -> crate::Result<interop::Card> {
    let kind: String = row.get(6)?;
    let fnt: i32 = row.get(8)?;

    Ok(interop::Card {
        id: row.get(0)?,
        note_id: row.get(1)?,
        note_content: row.get(3)?,
        deck_info: interop_decks::SlimDeck {
            id: row.get(4)?,
            title: row.get(5)?,
            deck_kind: interop_decks::DeckKind::from_str(&kind)?,
            graph_terminator: row.get(9)?,
            insignia: row.get(7)?,
            font: Font::try_from(fnt)?,
        },
        prompt: row.get(2)?,
    })
}

pub(crate) fn get_cards(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> crate::Result<Vec<interop::Card>> {
    info!("get_cards");

    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, n.content, d.id AS deck_id, d.name AS deck_name, d.kind AS deck_kind, d.insignia, d.font, d.graph_terminator
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id and c.user_id = ?1 and c.next_test_date < ?2",
        params![&user_id, &due],
        interop_card_from_row
    )
}

pub(crate) fn get_practice_card(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<interop::Card> {
    info!("get_practice_card");

    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, n.content, d.id AS deck_id, d.name AS deck_name, d.kind AS deck_kind, d.insignia, d.font, d.graph_terminator
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
) -> crate::Result<interop::CardUpcomingReview> {
    info!("get_cards_upcoming_review");

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    fn i32_from_row(row: &Row) -> crate::Result<i32> {
        Ok(row.get(0)?)
    }

    fn naive_datetime_from_row(row: &Row) -> crate::Result<chrono::NaiveDateTime> {
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

    let num_cards = sqlite::one(
        &tx,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = ?1",
        params![&user_id],
        i32_from_row,
    )?;

    let earliest_review_date: Option<chrono::NaiveDateTime> = if num_cards > 0 {
        Some(sqlite::one(
            &tx,
            "SELECT MIN(next_test_date) as earliest_review_date
         FROM cards
         WHERE user_id = ?1
         GROUP BY user_id",
            params![&user_id],
            naive_datetime_from_row,
        )?)
    } else {
        None
    };

    tx.commit()?;

    Ok(interop::CardUpcomingReview {
        review_count,
        earliest_review_date,
    })
}
