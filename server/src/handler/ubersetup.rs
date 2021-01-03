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

use crate::error::Result;
use crate::session;
use actix_web::web::Data;
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

use crate::db::uploader as db_uploader;
use crate::db::autocomplete as db_autocomplete;
use crate::db::decks as db_deck;
use crate::handler::cmd::packed_kind;

use crate::interop::Key;
use crate::interop::uploader as interop_uploader;
use crate::interop::autocomplete as interop_autocomplete;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct UberStruct {
    pub directory: Key,
    pub recent_images: Vec<interop_uploader::UserUploadedImage>,
    pub autocomplete: Vec<interop_autocomplete::Autocomplete>,
    pub graph_list: Vec<i32>,
}

pub async fn setup(
    db_pool: Data<Pool>,
    session: actix_session::Session
) -> Result<HttpResponse> {
    info!("get_directory");

    let user_id = session::user_id(&session)?;

    let directory = user_id;

    let (recent_images, autocomplete, graph) = tokio::try_join!(
        db_uploader::get_recent(&db_pool, user_id),
        db_autocomplete::get_decks(&db_pool, user_id),
        db_deck::graph(&db_pool, user_id),
    )?;

    // pack the graph information as integer quadruples
    let mut graph_list: Vec<i32> = vec![];
    for r in graph {
        graph_list.push(r.from_id as i32);
        graph_list.push(r.to_id as i32);
        graph_list.push(packed_kind(r.kind));
        graph_list.push(r.strength as i32);
    }

    let uber = UberStruct {
        directory,
        recent_images,
        autocomplete,
        graph_list,
    };

    Ok(HttpResponse::Ok().json(uber))
}
