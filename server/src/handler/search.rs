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
use crate::db::sqlite::SqlitePool;
use crate::handler::SearchQuery;
use crate::interop::search::{SearchResults, SeekDeck};
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Path, Query};
use actix_web::HttpResponse;

#[allow(unused_imports)]
use tracing::{info, warn};

pub async fn search(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("search '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::search(&sqlite_pool, user_id, &query.q)?;

    let res = SearchResults {
        deck_level: results,
        note_level: vec![],
    };

    Ok(HttpResponse::Ok().json(res))
}

pub async fn namesearch(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("namesearch '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::search_by_name(&sqlite_pool, user_id, &query.q)?;

    let res = SearchResults {
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
    info!("additional_search {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;

    let additional_search_results = db::additional_search(&sqlite_pool, user_id, deck_id)?;
    let additional_seek_results = db::notes_additional_search(&sqlite_pool, user_id, deck_id)?;

    fn has(seek_deck: &SeekDeck, seek_decks: &[SeekDeck]) -> bool {
        seek_decks.iter().any(|s| s.deck.id == seek_deck.deck.id)
    }

    // seek_results take priority as they will probably be more relevant.
    // so dedupe the search_results from the seek_results
    //
    let search_results: Vec<SeekDeck> = additional_search_results
        .into_iter()
        .filter(|seek_deck| !has(seek_deck, &additional_seek_results))
        .collect();

    let res = SearchResults {
        deck_level: search_results,
        note_level: additional_seek_results,
    };

    Ok(HttpResponse::Ok().json(res))
}

pub async fn seek(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
    Query(query): Query<SearchQuery>,
) -> crate::Result<HttpResponse> {
    info!("seek_new '{}'", &query.q);

    let user_id = session::user_id(&session)?;

    let results = db::seek(&sqlite_pool, user_id, &query.q)?;

    let res = SearchResults {
        deck_level: vec![],
        note_level: results,
    };

    Ok(HttpResponse::Ok().json(res))
}
