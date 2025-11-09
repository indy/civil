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

use crate::db::sqlite::{self, FromRow};
use crate::db::{DbError, SqlitePool, db};
use crate::interop::Key;
use crate::interop::decks::SlimDeck;
use crate::interop::memorise::{Card, CardUpcomingReview, FlashCard, ProtoCard};

use chrono::Utc;
use rusqlite::{Row, params};
#[allow(unused_imports)]
use tracing::info;

impl From<(FlashCard, SlimDeck)> for Card {
    fn from(e: (FlashCard, SlimDeck)) -> Card {
        let (c, slimdeck) = e;

        Card {
            id: c.id,
            note_id: c.note_id,
            note_content: "???".to_string(),
            deck_info: slimdeck,
            prompt: c.prompt,
        }
    }
}

impl FromRow for FlashCard {
    fn from_row(row: &Row) -> rusqlite::Result<FlashCard> {
        Ok(FlashCard {
            id: row.get(0)?,

            note_id: row.get(1)?,
            prompt: row.get(2)?,
            next_test_date: row.get(3)?,

            easiness_factor: row.get(4)?,
            interval: row.get(5)?,
            repetition: row.get(6)?,
        })
    }
}

impl FromRow for Card {
    fn from_row(row: &Row) -> rusqlite::Result<Card> {
        Ok(Card {
            id: row.get(0)?,
            note_id: row.get(1)?,
            note_content: row.get(3)?,
            deck_info: SlimDeck {
                id: row.get(4)?,
                title: row.get(5)?,
                deck_kind: row.get(6)?,
                created_at: row.get(7)?,
                graph_terminator: row.get(8)?,
                insignia: row.get(9)?,
                font: row.get(10)?,
                impact: row.get(11)?,
            },
            prompt: row.get(2)?,
        })
    }
}

pub(crate) fn all_flashcards_for_deck(
    conn: &rusqlite::Connection,
    deck_id: Key,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, c.next_test_date,
                c.easiness_factor, c.interval, c.repetition
         FROM cards c, decks d, notes n
         WHERE d.id=?1 AND n.deck_id = d.id AND c.note_id = n.id",
        params![&deck_id],
    )
}

pub(crate) fn all_flashcards_for_note(
    conn: &rusqlite::Connection,
    note_id: Key,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, c.next_test_date,
                c.easiness_factor, c.interval, c.repetition
         FROM cards c, notes n
         WHERE n.id=?1 AND c.note_id = n.id",
        params![&note_id],
    )
}

pub(crate) fn all_flashcards_for_deck_arrivals_conn(
    conn: &rusqlite::Connection,
    deck_id: Key,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        "SELECT   c.id, c.note_id, c.prompt, c.next_test_date,
                  c.easiness_factor, c.interval, c.repetition
         FROM     refs r
                  FULL JOIN notes n on r.note_id = n.id
                  FULL JOIN decks owner_deck on n.deck_id = owner_deck.id
                  INNER JOIN cards c on c.note_id = n.id
         WHERE    r.deck_id = ?1",
        params![&deck_id],
    )
}

pub(crate) fn all_flashcards_for_deck_additional_query(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
    sane_name: &str,
) -> Result<Vec<FlashCard>, DbError> {
    if sane_name.is_empty() {
        return Ok(vec![]);
    }

    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, c.next_test_date,
                c.easiness_factor, c.interval, c.repetition,
                notes_fts.rank AS rank
         FROM notes_fts
              LEFT JOIN notes n ON n.id = notes_fts.rowid
              LEFT JOIN decks d ON d.id = n.deck_id
              LEFT JOIN dialogue_messages dm ON dm.note_id = n.id
              INNER JOIN cards c on c.note_id = n.id
         WHERE notes_fts match ?2
               AND d.user_id = ?1
               AND d.id <> ?3
               AND (dm.role IS null OR dm.role <> 'system')
         ORDER BY rank ASC
         LIMIT 100",
        params![&user_id, &sane_name, &deck_id],
    )
}

pub(crate) fn all_flashcards_for_search_query_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    query: String,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, c.next_test_date,
                   c.easiness_factor, c.interval, c.repetition,
                   notes_fts.rank AS rank
         FROM notes_fts
              LEFT JOIN notes n ON n.id = notes_fts.rowid
              LEFT JOIN decks d ON d.id = n.deck_id
              LEFT JOIN dialogue_messages dm ON dm.note_id = n.id
              INNER JOIN cards c on c.note_id = n.id
         WHERE notes_fts match ?2
               AND d.user_id = ?1
               AND (dm.role IS null OR dm.role <> 'system')
         ORDER BY rank ASC
         LIMIT 100",
        params![&user_id, &query],
    )
}

fn create_card_conn(
    conn: &mut rusqlite::Connection,
    card: ProtoCard,
    user_id: Key,
) -> Result<FlashCard, DbError> {
    info!("create_card");

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
    )?;

    tx.commit()?;

    Ok(flashcard)
}

pub(crate) async fn create_card(
    sqlite_pool: &SqlitePool,
    card: ProtoCard,
    user_id: Key,
) -> crate::Result<FlashCard> {
    db(sqlite_pool, move |conn| {
        create_card_conn(conn, card, user_id)
    })
    .await
}

fn get_card_full_fat_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    card_id: Key,
) -> Result<FlashCard, DbError> {
    info!("get_card_full_fat");

    sqlite::one(
        &conn,
        "SELECT id, note_id, prompt, next_test_date, easiness_factor, interval, repetition
         FROM cards
         WHERE user_id=?1 and id=?2",
        params![&user_id, &card_id],
    )
}

pub(crate) async fn get_card_full_fat(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    card_id: Key,
) -> crate::Result<FlashCard> {
    db(sqlite_pool, move |conn| {
        get_card_full_fat_conn(conn, user_id, card_id)
    })
    .await
}

fn card_rated_conn(
    conn: &mut rusqlite::Connection,
    card: FlashCard,
    rating: i16,
) -> Result<(), DbError> {
    info!("card_rated");

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

pub(crate) async fn card_rated(
    sqlite_pool: &SqlitePool,
    card: FlashCard,
    rating: i16,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| card_rated_conn(conn, card, rating)).await
}

fn edit_flashcard_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    flashcard: FlashCard,
    flashcard_id: Key,
) -> Result<FlashCard, DbError> {
    sqlite::one(
        &conn,
        "UPDATE cards
         SET prompt = ?3
         WHERE id = ?2 and user_id = ?1
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, interval, repetition",
        params![&user_id, &flashcard_id, &flashcard.prompt],
    )
}

pub(crate) async fn edit_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard: FlashCard,
    flashcard_id: Key,
) -> crate::Result<FlashCard> {
    db(sqlite_pool, move |conn| {
        edit_flashcard_conn(conn, user_id, flashcard, flashcard_id)
    })
    .await
}

fn delete_flashcard_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    flashcard_id: Key,
) -> Result<(), DbError> {
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

pub(crate) async fn delete_flashcard(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    flashcard_id: Key,
) -> crate::Result<()> {
    db(sqlite_pool, move |conn| {
        delete_flashcard_conn(conn, user_id, flashcard_id)
    })
    .await
}

fn get_cards_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> Result<Vec<Card>, DbError> {
    info!("get_cards");

    sqlite::many(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, n.content, d.id,
                d.name, d.kind, d.created_at, d.graph_terminator,
                d.insignia, d.font, d.impact
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id AND c.user_id = ?1
               AND c.next_test_date < ?2",
        params![&user_id, &due],
    )
}

pub(crate) async fn get_cards(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> crate::Result<Vec<Card>> {
    db(sqlite_pool, move |conn| get_cards_conn(conn, user_id, due)).await
}

fn get_practice_card_conn(conn: &rusqlite::Connection, user_id: Key) -> Result<Card, DbError> {
    info!("get_practice_card");

    sqlite::one(
        &conn,
        "SELECT c.id, c.note_id, c.prompt, n.content, d.id,
                d.name, d.kind, d.created_at, d.graph_terminator,
                d.insignia, d.font, d.impact
         FROM cards c, decks d, notes n
         WHERE d.id = n.deck_id AND n.id = c.note_id and c.user_id = ?1
         ORDER BY random()
         LIMIT 1",
        params![&user_id],
    )
}

pub(crate) async fn get_practice_card(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Card> {
    db(sqlite_pool, move |conn| {
        get_practice_card_conn(conn, user_id)
    })
    .await
}

fn get_cards_upcoming_review_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> Result<CardUpcomingReview, DbError> {
    info!("get_cards_upcoming_review");
    let tx = conn.transaction()?;

    let review_count = sqlite::one(
        &tx,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = ?1 and next_test_date < ?2",
        params![&user_id, &due],
    )?;

    let num_cards: i32 = sqlite::one(
        &tx,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = ?1",
        params![&user_id],
    )?;

    let earliest_review_date: Option<chrono::NaiveDateTime> = if num_cards > 0 {
        Some(sqlite::one(
            &tx,
            "SELECT MIN(next_test_date) as earliest_review_date
             FROM cards
             WHERE user_id = ?1
             GROUP BY user_id",
            params![&user_id],
        )?)
    } else {
        None
    };

    tx.commit()?;

    Ok(CardUpcomingReview {
        review_count,
        earliest_review_date,
    })
}

pub(crate) async fn get_cards_upcoming_review(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> crate::Result<CardUpcomingReview> {
    db(sqlite_pool, move |conn| {
        get_cards_upcoming_review_conn(conn, user_id, due)
    })
    .await
}
