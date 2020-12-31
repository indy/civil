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

use crate::db::sr as db;
use crate::error::Result;
use crate::interop::sr::{ProtoCard, ProtoRating};
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub async fn create_card(
    card: Json<ProtoCard>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create card");

    let user_id = session::user_id(&session)?;
    let card = card.into_inner();

    let db_card = db::create_card(&db_pool, &card, user_id).await?;

    Ok(HttpResponse::Ok().json(db_card))
}

pub async fn card_rated(
    rating: Json<ProtoRating>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("card_rated id:{:?}", params.id);

    // need to be in a session, even though we're not using the information
    // card_evaluations are linked to a user via the card_id
    let _user_id = session::user_id(&session)?;
    let rating = rating.into_inner();

    let db_eval = db::card_rating(&db_pool, params.id, &rating).await?;

    Ok(HttpResponse::Ok().json(db_eval))
}

pub async fn get_cards(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;
    let db_cards = db::get_cards(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(db_cards))
}
