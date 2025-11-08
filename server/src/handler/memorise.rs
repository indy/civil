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

use crate::db::memorise as db;
use crate::db::SqlitePool;
use crate::handler::AuthUser;
use crate::interop::memorise::{FlashCard, ProtoCard, ProtoRating};
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path};
use actix_web::Responder;
use chrono::{Duration, Utc};

pub async fn create_card(
    Json(card): Json<ProtoCard>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let card = db::create_card(&sqlite_pool, card, user_id).await?;

    Ok(Json(card))
}

pub async fn card_rated(
    Json(rating): Json<ProtoRating>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    // need to be in a session, even though we're not using the information
    // card_ratings are linked to a user via the card_id
    let rating = rating.rating;

    if (0..=5).contains(&rating) {
        let mut card = db::get_card_full_fat(&sqlite_pool, user_id, params.id).await?;
        card = sqlite_update_easiness_factor(card, rating)?;

        db::card_rated(&sqlite_pool, card, rating).await?;

        Ok(Json(true))
    } else {
        Ok(Json(false))
    }
}

pub async fn edit(
    Json(flashcard): Json<FlashCard>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let flashcard = db::edit_flashcard(&sqlite_pool, user_id, flashcard, params.id).await?;

    Ok(Json(flashcard))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    db::delete_flashcard(&sqlite_pool, user_id, params.id).await?;

    Ok(Json(true))
}

/*
5 - perfect response
4 - correct response after a hesitation
3 - correct response recalled with serious difficulty
2 - incorrect response; where the correct one seemed easy to recall
1 - incorrect response; the correct one remembered
0 - complete blackout.
*/
fn sqlite_update_easiness_factor(mut card: FlashCard, rating: i16) -> crate::Result<FlashCard> {
    // note: repetition starts at 1, that's the initial value given to a new card
    if rating < 3 {
        // start repetitions for the item from the beginning without changing the E-Factor (i.e. use intervals I(1), I(2) etc. as if the item was memorized anew
        card.interval = 1;
        card.repetition = 1;
    } else {
        // according to https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
        // calculate the inter_repetition_interval using the existing easiness_factor, then update the easiness_factor
        //
        if card.repetition == 1 {
            // a new card hasn't been recalled yet
            card.interval = 1;
            card.repetition = 2;
        } else if card.repetition == 2 {
            // a card that's been recalled once
            card.interval = 6;
            card.repetition = 3;
        } else {
            let interval_f32: f32 = (card.interval as f32) * card.easiness_factor;
            let mut new_interval = interval_f32 as i32;

            if interval_f32 - (new_interval as f32) > 0.5 {
                // round up inter_repetition_interval
                new_interval += 1;
            }

            card.interval = new_interval;
            card.repetition += 1;
        }
    }

    let rating_f32: f32 = rating as f32;

    card.easiness_factor += 0.1 - (5.0 - rating_f32) * (0.08 + (5.0 - rating_f32) * 0.02);

    if card.easiness_factor < 1.3 {
        card.easiness_factor = 1.3;
    }

    card.next_test_date = Utc::now().naive_utc() + Duration::days(card.interval.into());

    // there is logic in the client to re-display cards in a session until they've all been rated at least 4

    Ok(card)
}

pub async fn get_cards(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let db_cards = db::get_cards(&sqlite_pool, user_id, Utc::now().naive_utc()).await?;

    Ok(Json(db_cards))
}

pub async fn get_practice_card(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let db_card = db::get_practice_card(&sqlite_pool, user_id).await?;

    Ok(Json(db_card))
}
