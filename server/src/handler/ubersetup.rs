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
use crate::error::Result;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;
use chrono::Utc;

#[allow(unused_imports)]
use tracing::info;

use crate::db::articles as db_articles;
use crate::db::dialogues as db_dialogues;
use crate::db::edges as db_edges;
use crate::db::ideas as db_ideas;
use crate::db::memorise as db_memorise;
use crate::db::people as db_people;
use crate::db::timelines as db_timelines;

use crate::db::uploader as db_uploader;

use crate::interop::articles as interop_articles;
use crate::interop::decks::SlimDeck;
use crate::interop::ideas as interop_ideas;
use crate::interop::people as interop_people;
use crate::interop::uploader as interop_uploader;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UberStruct {
    pub directory: Key,
    pub recently_used_decks: Vec<SlimDeck>,
    pub recent_images: Vec<interop_uploader::UserUploadedImage>,
    pub memorise_review_count: i32,
    pub memorise_earliest_review_date: chrono::NaiveDateTime,

    pub ideas: interop_ideas::IdeasListings,
    pub people: interop_people::PeopleListings,
    pub articles: interop_articles::ArticleListings,
    pub timelines: Vec<SlimDeck>,
    pub dialogues: Vec<SlimDeck>,
}

pub async fn setup(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("setup");

    let user_id = session::user_id(&session)?;

    let directory = user_id;
    let recently_used_decks = db_edges::get_recently_used_decks(&sqlite_pool, user_id)?;
    let recent_images = db_uploader::get_recent(&sqlite_pool, user_id, 0)?;
    let upcoming_review =
        db_memorise::get_cards_upcoming_review(&sqlite_pool, user_id, Utc::now().naive_utc())?;

    let ideas = db_ideas::listings(&sqlite_pool, user_id)?;
    let people = db_people::listings(&sqlite_pool, user_id)?;
    let articles = db_articles::listings(&sqlite_pool, user_id)?;
    let timelines = db_timelines::listings(&sqlite_pool, user_id)?;
    let dialogues = db_dialogues::listings(&sqlite_pool, user_id)?;

    let uber = UberStruct {
        directory,
        recently_used_decks,
        recent_images,
        memorise_review_count: upcoming_review.review_count,
        memorise_earliest_review_date: upcoming_review.earliest_review_date,
        ideas,
        people,
        articles,
        timelines,
        dialogues,
    };

    Ok(HttpResponse::Ok().json(uber))
}
