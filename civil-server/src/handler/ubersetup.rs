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

use crate::db::decks as db_deck;
use crate::db::graph as db_graph;
use crate::db::sr as db_sr;
use crate::db::uploader as db_uploader;
use crate::handler::cmd::packed_kind;

use crate::interop::graph as interop_graph;
use crate::interop::uploader as interop_uploader;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct UberStruct {
    pub directory: Key,
    pub recent_images: Vec<interop_uploader::UserUploadedImage>,
    pub graph: Vec<interop_graph::Graph>,
    pub graph_list: Vec<i32>,
    pub sr_review_count: i32,
    pub sr_earliest_review_date: chrono::DateTime<chrono::Utc>,
}

pub async fn setup(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_directory");

    let user_id = session::user_id(&session)?;

    let directory = user_id;

    let (recent_images, graph, deck_graph, upcoming_review) = tokio::try_join!(
        db_uploader::get_recent(&db_pool, user_id),
        db_graph::get_decks(&db_pool, user_id),
        db_deck::graph(&db_pool, user_id),
        db_sr::get_cards_upcoming_review(&db_pool, user_id, Utc::now()),
    )?;

    // pack the graph information as integer quadruples
    let mut graph_list: Vec<i32> = vec![];
    for r in deck_graph {
        graph_list.push(r.from_id as i32);
        graph_list.push(r.to_id as i32);
        graph_list.push(packed_kind(r.kind));
        graph_list.push(r.strength as i32);
    }

    let uber = UberStruct {
        directory,
        recent_images,
        graph,
        graph_list,
        sr_review_count: upcoming_review.review_count,
        sr_earliest_review_date: upcoming_review.earliest_review_date,
    };

    Ok(HttpResponse::Ok().json(uber))
}
