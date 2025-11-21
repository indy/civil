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

use crate::db::DbError;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::SlimDeck;
use crate::interop::memorise::{Card, CardUpcomingReview, FlashCard, ProtoCard};
use chrono::Utc;
use rusqlite::{Row, named_params};
use crate::db::qry::Qry;

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
            id: row.get("id")?,

            note_id: row.get("note_id")?,
            prompt: row.get("prompt")?,
            next_test_date: row.get("next_test_date")?,

            easiness_factor: row.get("easiness_factor")?,
            interval: row.get("interval")?,
            repetition: row.get("repetition")?,
        })
    }
}

impl FromRow for Card {
    fn from_row(row: &Row) -> rusqlite::Result<Card> {
        Ok(Card {
            id: row.get("id")?,
            note_id: row.get("note_id")?,
            note_content: row.get("note_content")?,
            deck_info: SlimDeck {
                id: row.get("deck_id")?,
                title: row.get("deck_name")?,
                deck_kind: row.get("deck_kind")?,
                created_at: row.get("deck_created_at")?,
                graph_terminator: row.get("deck_graph_terminator")?,
                insignia: row.get("deck_insignia")?,
                font: row.get("deck_font")?,
                impact: row.get("deck_impact")?,
            },
            prompt: row.get("prompt")?,
        })
    }
}

fn memorise_query_common_select() -> Qry {
    Qry::select("c.id as id, c.note_id as note_id, c.prompt as prompt, c.next_test_date as next_test_date,
                c.easiness_factor as easiness_factor, c.interval as interval, c.repetition as repetition")
}

pub(crate) fn all_flashcards_for_deck(
    conn: &rusqlite::Connection,
    deck_id: Key,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        &memorise_query_common_select()
            .from("cards c")
            .join("notes n ON c.note_id = n.id")
            .join("decks d ON n.deck_id = d.id")
            .where_clause("d.id = :deck_id"),
        named_params! {":deck_id": deck_id},
    )
}

pub(crate) fn all_flashcards_for_note(
    conn: &rusqlite::Connection,
    note_id: Key,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        &memorise_query_common_select()
            .from("cards c")
            .join("notes n ON c.note_id = n.id")
            .where_clause("n.id = :note_id"),
        named_params! {":note_id": note_id},
    )
}

pub(crate) fn all_flashcards_for_deck_arrivals(
    conn: &rusqlite::Connection,
    deck_id: Key,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        &memorise_query_common_select()
            .from("refs r")
            .full_join("notes n ON r.note_id = n.id")
            .full_join("decks owner_deck on n.deck_id = owner_deck.id")
            .inner_join("cards c on c.note_id = n.id")
            .where_clause("r.deck_id = :deck_id"),
        named_params! {":deck_id": deck_id},
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
        &memorise_query_common_select().comma("notes_fts.rank as rank")
            .from("notes_fts")
            .left_join("notes n ON n.id = notes_fts.rowid")
            .left_join("decks d ON d.id = n.deck_id")
            .left_join("dialogue_messages dm ON dm.note_id = n.id")
            .inner_join("cards c on c.note_id = n.id")
            .where_clause("notes_fts match :sane_name")
            .and("d.user_id = :user_id")
            .and("d.id <> :deck_id")
            .and("(dm.role IS null OR dm.role <> 'system')")
            .order_by("rank ASC")
            .limit(),
        named_params! {":user_id": user_id, ":sane_name": sane_name, ":deck_id": deck_id, ":limit": 100},
    )
}

pub(crate) fn all_flashcards_for_search_query(
    conn: &rusqlite::Connection,
    user_id: Key,
    query: String,
) -> Result<Vec<FlashCard>, DbError> {
    sqlite::many(
        &conn,
        &memorise_query_common_select().comma("notes_fts.rank as rank")
            .from("notes_fts")
            .left_join("notes n ON n.id = notes_fts.rowid")
            .left_join("decks d ON d.id = n.deck_id")
            .left_join("dialogue_messages dm ON dm.note_id = n.id")
            .inner_join("cards c on c.note_id = n.id")
            .where_clause("notes_fts match :query")
            .and("d.user_id = :user_id")
            .and("(dm.role IS null OR dm.role <> 'system')")
            .order_by("rank ASC")
            .limit(),
        named_params! {":user_id": user_id, ":query": query, ":limit": 100},
    )
}

pub(crate) fn create_card(
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
         VALUES (:user_id, :note_id, :prompt, :next_test_date, :easiness_factor, :interval, :repetition)
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, interval, repetition",
        named_params!{
            ":user_id": user_id,
            ":note_id": card.note_id,
            ":prompt": card.prompt,
            ":next_test_date": next_test_date,
            ":easiness_factor": easiness_factor,
            ":interval": interval,
            ":repetition": repetition
        },
    )?;

    tx.commit()?;

    Ok(flashcard)
}

pub(crate) fn get_card_full_fat(
    conn: &rusqlite::Connection,
    user_id: Key,
    card_id: Key,
) -> Result<FlashCard, DbError> {
    info!("get_card_full_fat");

    sqlite::one(
        &conn,
        "SELECT id, note_id, prompt, next_test_date, easiness_factor, interval, repetition
         FROM cards
         WHERE user_id = :user_id and id = :card_id",
        named_params! {":user_id": user_id, ":card_id": card_id},
    )
}

pub(crate) fn card_rated(
    conn: &mut rusqlite::Connection,
    card: FlashCard,
    rating: i16,
) -> Result<(), DbError> {
    info!("card_rated");

    let tx = conn.transaction()?;

    sqlite::zero(
        &tx,
        "UPDATE cards
         SET next_test_date = :next_test_date, easiness_factor = :easiness_factor, interval = :interval, repetition = :repetition
         WHERE id = :card_id",
        named_params!{
            ":card_id": card.id,
            ":next_test_date": card.next_test_date,
            ":easiness_factor": card.easiness_factor,
            ":interval": card.interval,
            ":repetition": card.repetition,
        },
    )?;

    sqlite::zero(
        &tx,
        "INSERT INTO card_ratings(card_id, rating)
         VALUES (:card_id, :rating)",
        named_params! {":card_id": card.id, ":rating": rating},
    )?;

    tx.commit()?;

    Ok(())
}

pub(crate) fn edit_flashcard(
    conn: &rusqlite::Connection,
    user_id: Key,
    flashcard: FlashCard,
    flashcard_id: Key,
) -> Result<FlashCard, DbError> {
    sqlite::one(
        &conn,
        "UPDATE cards
         SET prompt = :prompt
         WHERE id = :card_id and user_id = :user_id
         RETURNING id, note_id, prompt, next_test_date, easiness_factor, interval, repetition",
        named_params! {":user_id": user_id, ":card_id": flashcard_id, ":prompt": flashcard.prompt},
    )
}

pub(crate) fn delete_flashcard(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    flashcard_id: Key,
) -> Result<(), DbError> {
    let tx = conn.transaction()?;

    sqlite::zero(
        &tx,
        "DELETE FROM card_ratings WHERE card_id = :card_id",
        named_params! {":card_id": flashcard_id},
    )?;

    sqlite::zero(
        &tx,
        "DELETE FROM cards WHERE id = :card_id AND user_id = :user_id",
        named_params! {":card_id": flashcard_id, ":user_id": user_id},
    )?;

    tx.commit()?;

    Ok(())
}


fn get_card_select() -> Qry {
    Qry::select("c.id as id, c.note_id as note_id, c.prompt as prompt, n.content as note_content, d.id as deck_id,
                d.name as deck_name, d.kind as deck_kind, d.created_at as deck_created_at, d.graph_terminator as deck_graph_terminator,
                d.insignia as deck_insignia, d.font as deck_font, d.impact as deck_impact")
    .from("cards c")
        .join("notes n ON n.id = c.note_id")
        .join("decks d ON d.id = n.deck_id")
        .where_clause("c.user_id = :user_id")
}


pub(crate) fn get_cards(
    conn: &rusqlite::Connection,
    user_id: Key,
    due: chrono::NaiveDateTime,
) -> Result<Vec<Card>, DbError> {
    sqlite::many(
        &conn,
        &get_card_select().and("c.next_test_date < :next_test_date"),
        named_params! {":user_id": user_id, ":next_test_date": due},
    )
}

pub(crate) fn get_practice_card(
    conn: &rusqlite::Connection,
    user_id: Key,
) -> Result<Card, DbError> {
    sqlite::one(
        &conn,
        &get_card_select().order_by("random()").limit(),
        named_params! {":user_id": user_id, ":limit": 1},
    )
}

pub(crate) fn get_cards_upcoming_review(
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
         WHERE user_id = :user_id and next_test_date < :next_test_date",
        named_params! {":user_id": user_id, ":next_test_date": due},
    )?;

    let num_cards: i32 = sqlite::one(
        &tx,
        "SELECT count(*) as review_count
         FROM cards
         WHERE user_id = :user_id",
        named_params! {":user_id": user_id},
    )?;

    let earliest_review_date: Option<chrono::NaiveDateTime> = if num_cards > 0 {
        Some(sqlite::one(
            &tx,
            "SELECT MIN(next_test_date) as earliest_review_date
             FROM cards
             WHERE user_id = :user_id
             GROUP BY user_id",
            named_params! {":user_id": user_id},
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
