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

use crate::db::bookmarks as db_bookmarks;
use crate::db::memorise as db_memorise;
use crate::db::references as db_references;
use crate::db::uploader as db_uploader;
use crate::db::{SqlitePool, db_thread};
use crate::handler::AuthUser;
use crate::interop::Key;
use crate::interop::bookmarks as interop_bookmarks;
use crate::interop::decks::SlimDeck;
use crate::interop::uploader as interop_uploader;
use actix_web::Responder;
use actix_web::web::{Data, Json};
use chrono::Utc;

#[allow(unused_imports)]
use tracing::{error, info};

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UberStruct {
    pub directory: Key,
    pub recently_used_decks: Vec<SlimDeck>,
    pub recent_images: Vec<interop_uploader::UserUploadedImage>,
    pub memorise_review_count: i32,
    pub memorise_earliest_review_date: Option<chrono::NaiveDateTime>,
    pub bookmarks: Vec<interop_bookmarks::Bookmark>,
}

pub async fn setup(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let directory = user_id;

    let recently_used_decks = db_thread(&sqlite_pool, move |conn| {
        db_references::decks_recently_referenced(conn, user_id)
    })
    .await?;

    let recent_images = db_thread(&sqlite_pool, move |conn| {
        db_uploader::get_recent(conn, user_id, 0)
    })
    .await?;

    let upcoming_review = db_thread(&sqlite_pool, move |conn| {
        db_memorise::get_cards_upcoming_review(conn, user_id, Utc::now().naive_utc())
    })
    .await?;

    let bookmarks = db_thread(&sqlite_pool, move |conn| {
        db_bookmarks::get_bookmarks(conn, user_id)
    })
    .await?;

    let uber = UberStruct {
        directory,
        recently_used_decks,
        recent_images,
        memorise_review_count: upcoming_review.review_count,
        memorise_earliest_review_date: upcoming_review.earliest_review_date,
        bookmarks,
    };

    Ok(Json(uber))
}
