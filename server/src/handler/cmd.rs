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

use crate::db::decks as db;
use crate::db::notes as db_notes;
use crate::db::sqlite::SqlitePool;
use crate::error::{Error, Result};
use crate::handler::SearchQuery;
use crate::interop::decks::{DeckKind, ResultList};
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{self, Data, Path};
use actix_web::HttpResponse;
use serde::Deserialize;

#[allow(unused_imports)]
use tracing::info;

pub async fn search(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<SearchQuery>,
) -> Result<HttpResponse> {
    info!("search '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::search(&sqlite_pool, user_id, &query.q)?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
}

pub async fn namesearch(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<SearchQuery>,
) -> Result<HttpResponse> {
    info!("namesearch '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::search_by_name(&sqlite_pool, user_id, &query.q)?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
}

#[derive(Deserialize)]
pub struct RecentQuery {
    resource: String,
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    web::Query(query): web::Query<RecentQuery>,
) -> Result<HttpResponse> {
    info!("recent {}", &query.resource);

    let user_id = session::user_id(&session)?;

    fn resource_string_to_deck_kind(resource: &str) -> Result<DeckKind> {
        match resource {
            "articles" => Ok(DeckKind::Article),
            "dialogues" => Ok(DeckKind::Dialogue),
            "ideas" => Ok(DeckKind::Idea),
            "people" => Ok(DeckKind::Person),
            "quotes" => Ok(DeckKind::Quote),
            "timelines" => Ok(DeckKind::Timeline),
            _ => Err(Error::InvalidResource),
        }
    }

    let deck_kind = resource_string_to_deck_kind(&query.resource)?;
    let results = db::recent(&sqlite_pool, user_id, deck_kind)?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
}

pub async fn preview(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("preview {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;

    let preview = db_notes::preview(&sqlite_pool, user_id, deck_id)?;

    Ok(HttpResponse::Ok().json(preview))
}
