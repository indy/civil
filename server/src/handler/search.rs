// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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

use crate::db::search as db;
use crate::db::SqlitePool;
use crate::handler::SearchQuery;
use crate::interop::search::SearchResults;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Path, Query};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::{info, warn};

// called by the realtime search at the top of the page
//
pub async fn search_at_deck_level(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("search_at_deck_level '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let deck_level_results = db::search_at_deck_level(&sqlite_pool, user_id, &query.q)?;

    let res = SearchResults {
        search_text: query.q,
        deck_level: deck_level_results,
        note_level: vec![],
    };

    Ok(HttpResponse::Ok().json(res))
}

// called by CivilSelect to refine Candidates
//
pub async fn search_names_at_deck_level(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("search_names_at_deck_level '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::search_names_at_deck_level(&sqlite_pool, user_id, &query.q)?;

    let res = SearchResults {
        search_text: query.q,
        deck_level: results,
        note_level: vec![],
    };

    Ok(HttpResponse::Ok().json(res))
}

pub async fn additional_search_for_decks(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> crate::Result<HttpResponse> {
    info!("additional_search_for_decks {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;

    // search deck, article_extras etc tables for text similar to deck_id's title
    // ignore anything that explicitly links back to the deck
    //
    let res = db::additional_search_at_deck_level(&sqlite_pool, user_id, deck_id)?;

    Ok(HttpResponse::Ok().json(res))
}

// called by the search page
//
pub async fn search_at_all_levels(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("search_at_all_levels '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let res = db::search_at_all_levels(&sqlite_pool, user_id, &query.q)?;

    Ok(HttpResponse::Ok().json(res))
}

pub async fn search_quotes(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("search_quotes '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let res = db::search_quotes(&sqlite_pool, user_id, &query.q)?;

    Ok(HttpResponse::Ok().json(res))
}
