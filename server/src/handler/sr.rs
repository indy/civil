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

use crate::db::sr as db;
use crate::error::Result;
use crate::interop::sr::{SqliteFlashCard, ProtoCard, ProtoRating};
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use chrono::{Duration, Utc};
use crate::db::sqlite::SqlitePool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create_card(
    card: Json<ProtoCard>,
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create card");

    let user_id = session::user_id(&session)?;
    let card = card.into_inner();

    let db_card = db::sqlite_create_card(&sqlite_pool, &card, user_id)?;

    Ok(HttpResponse::Ok().json(db_card))
}

pub async fn card_rated(
    rating: Json<ProtoRating>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("card_rated id:{:?}", params.id);

    // need to be in a session, even though we're not using the information
    // card_ratings are linked to a user via the card_id
    let user_id = session::user_id(&session)?;
    let card_id = params.id;
    let rating = rating.into_inner().rating;

    if rating >= 0 && rating <= 5 {
        let mut card = db::sqlite_get_card_full_fat(&sqlite_pool, user_id, card_id)?;
        card = sqlite_update_easiness_factor(card, rating)?;

        db::sqlite_card_rated(&sqlite_pool, card, rating)?;

        Ok(HttpResponse::Ok().json(true))
    } else {
        Ok(HttpResponse::Ok().json(false))
    }
}

pub async fn edit(
    flashcard: Json<SqliteFlashCard>,
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("edit_flashcard");

    let flashcard = flashcard.into_inner();
    let user_id = session::user_id(&session)?;

    let flashcard = db::sqlite_edit_flashcard(&sqlite_pool, user_id, &flashcard, params.id)?;

    Ok(HttpResponse::Ok().json(flashcard))
}

pub async fn delete(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("delete flashcard {}", params.id);

    let user_id = session::user_id(&session)?;

    db::sqlite_delete_flashcard(&sqlite_pool, user_id, params.id)?;

    Ok(HttpResponse::Ok().json(true))
}

fn sqlite_update_easiness_factor(mut card: SqliteFlashCard, rating: i16) -> Result<SqliteFlashCard> {
    if rating < 3 {
        // start repetitions for the item from the beginning without changing the E-Factor (i.e. use intervals I(1), I(2) etc. as if the item was memorized anew
        card.inter_repetition_interval = 1;
    } else {
        // according to https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
        // calculate the inter_repetition_interval using the existing easiness_factor, then update the easiness_factor
        //
        if card.inter_repetition_interval == 0 {
            // a new card hasn't been recalled yet
            card.inter_repetition_interval = 1;
        } else if card.inter_repetition_interval == 1 {
            // a card that's been recalled once
            card.inter_repetition_interval = 6;
        } else {
            let iri_f32: f32 = (card.inter_repetition_interval as f32) * card.easiness_factor;
            let mut new_iri = iri_f32 as i32;

            if iri_f32 - (new_iri as f32) > 0.5 {
                // round up inter_repetition_interval
                new_iri += 1;
            }

            card.inter_repetition_interval = new_iri;
        }

        let rating_f32: f32 = rating as f32;
        card.easiness_factor =
            card.easiness_factor - 0.8 + (0.28 * rating_f32) - (0.02 * rating_f32 * rating_f32);
        if card.easiness_factor < 1.3 {
            card.easiness_factor = 1.3;
        }
    }


    card.next_test_date = Utc::now().naive_utc() + Duration::days(card.inter_repetition_interval.into());

    // there is logic in the client to re-display cards in a session until they've all been rated at least 4

    Ok(card)
}

pub async fn get_cards(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;
    let db_cards = db::sqlite_get_cards(&sqlite_pool, user_id, Utc::now().naive_utc())?;

    Ok(HttpResponse::Ok().json(db_cards))
}

pub async fn get_practice_card(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;
    let db_card = db::sqlite_get_practice_card(&sqlite_pool, user_id)?;

    Ok(HttpResponse::Ok().json(db_card))
}
