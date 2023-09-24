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

use crate::db::sqlite::SqlitePool;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;
use chrono::Utc;

#[allow(unused_imports)]
use tracing::info;

use crate::db::bookmarks as db_bookmarks;
use crate::db::memorise as db_memorise;
use crate::db::references as db_references;
use crate::db::uploader as db_uploader;
use crate::interop::bookmarks as interop_bookmarks;
use crate::interop::decks::SlimDeck;
use crate::interop::uploader as interop_uploader;
use crate::interop::Key;

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
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("setup");

    let user_id = session::user_id(&session)?;

    let directory = user_id;
    let recently_used_decks = db_references::get_decks_recently_referenced(&sqlite_pool, user_id)?;
    let recent_images = db_uploader::get_recent(&sqlite_pool, user_id, 0)?;
    let upcoming_review =
        db_memorise::get_cards_upcoming_review(&sqlite_pool, user_id, Utc::now().naive_utc())?;
    let bookmarks = db_bookmarks::get_bookmarks(&sqlite_pool, user_id)?;

    let uber = UberStruct {
        directory,
        recently_used_decks,
        recent_images,
        memorise_review_count: upcoming_review.review_count,
        memorise_earliest_review_date: upcoming_review.earliest_review_date,
        bookmarks,
    };

    Ok(HttpResponse::Ok().json(uber))
}
