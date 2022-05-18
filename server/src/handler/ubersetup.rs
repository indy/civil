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

use crate::error::Result;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;
use chrono::Utc;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

use crate::db::sr as db_sr;
use crate::db::uploader as db_uploader;

use crate::interop::uploader as interop_uploader;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct UberStruct {
    pub directory: Key,
    pub recent_images: Vec<interop_uploader::UserUploadedImage>,
    pub sr_review_count: i32,
    pub sr_earliest_review_date: chrono::DateTime<chrono::Utc>,
}

pub async fn setup(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("setup");

    let user_id = session::user_id(&session)?;

    let directory = user_id;

    let (recent_images, upcoming_review) = tokio::try_join!(
        db_uploader::get_recent(&db_pool, user_id),
        db_sr::get_cards_upcoming_review(&db_pool, user_id, Utc::now()),
    )?;

    let uber = UberStruct {
        directory,
        recent_images,
        sr_review_count: upcoming_review.review_count,
        sr_earliest_review_date: upcoming_review.earliest_review_date,
    };

    Ok(HttpResponse::Ok().json(uber))
}
