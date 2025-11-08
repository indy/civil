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
use crate::handler::{AuthUser, SearchQuery};
use crate::interop::search::SearchResults;
use crate::interop::IdParam;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::Responder;

// called by the realtime search at the top of the page
//
pub async fn search_at_deck_level(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<SearchQuery>,
) -> crate::Result<impl Responder> {
    // nocheckin: sort out this q q2 stuff
    let q: String = query.q;
    let q2 = q.clone();
    let deck_level_results = db::search_at_deck_level(&sqlite_pool, user_id, q).await?;

    let res = SearchResults {
        search_text: q2,
        deck_level: deck_level_results,
        note_level: vec![],
    };

    Ok(Json(res))
}

// called by CivilSelect to refine Candidates
//
pub async fn search_names_at_deck_level(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<SearchQuery>,
) -> crate::Result<impl Responder> {
    // nocheckin: sort out this q q2 stuff
    let q: String = query.q;
    let q2 = q.clone();
    let results = db::search_names_at_deck_level(&sqlite_pool, user_id, q).await?;

    let res = SearchResults {
        search_text: q2,
        deck_level: results,
        note_level: vec![],
    };

    Ok(Json(res))
}

pub async fn additional_search_for_decks(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    // search deck, article_extras etc tables for text similar to deck_id's title
    // ignore anything that explicitly links back to the deck
    //
    let res = db::additional_search_at_deck_level(&sqlite_pool, user_id, params.id).await?;

    Ok(Json(res))
}

// called by the search page
//
pub async fn search_at_all_levels(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<SearchQuery>,
) -> crate::Result<impl Responder> {
    let res = db::search_at_all_levels(&sqlite_pool, user_id, query.q).await?;

    Ok(Json(res))
}

pub async fn search_quotes(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<SearchQuery>,
) -> crate::Result<impl Responder> {
    let res = db::search_quotes(&sqlite_pool, user_id, query.q).await?;

    Ok(Json(res))
}
