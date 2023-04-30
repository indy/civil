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
use crate::error::Result;
use crate::handler::SearchQuery;
use crate::interop::decks::ResultList;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{self, Data, Path};
use actix_web::HttpResponse;
use serde::Deserialize;

#[allow(unused_imports)]
use tracing::info;

use chatgpt::prelude::*;
use chatgpt::types::{ChatMessage, MessageChoice};

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatGPTResponse {
    pub response: Vec<CivilMessageChoice>
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CivilMessageChoice {
    /// The actual message
    pub message: ChatMessage,
    /// The reason completion was stopped
    pub finish_reason: String,
    /// The index of this message in the outer `message_choices` array
    pub index: u32,
}

impl From<MessageChoice> for CivilMessageChoice {
    fn from(mc: MessageChoice) -> CivilMessageChoice {
        CivilMessageChoice {
            message: mc.message,
            finish_reason: mc.finish_reason,
            index: mc.index
        }
    }
}

pub async fn ask(
    chatgpt_client: Data<ChatGPT>,
    web::Query(query): web::Query<SearchQuery>,
) -> Result<HttpResponse> {
    info!("ask '{}'", &query.q);

    let r = chatgpt_client
        .send_message(&query.q)
        .await?;

    let mut response: Vec<CivilMessageChoice> = vec![];
    for message_choice in r.message_choices {
        response.push(CivilMessageChoice::from(message_choice));
    }

    let res = ChatGPTResponse { response };

    Ok(HttpResponse::Ok().json(res))
}


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

    let results = db::recent(&sqlite_pool, user_id, &query.resource)?;

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
