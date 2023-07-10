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
// use crate::external::openai;
use crate::handler::SearchQuery;
use crate::interop::decks::{DeckKind, ResultList};
// use crate::interop::dialogues as interop_dialogues;
// use crate::interop::notes::Note;
use crate::interop::{IdParam, InsigParam /*, Key*/};
use crate::session;
use actix_web::web::{self, Data, Path};
use actix_web::HttpResponse;
use serde::Deserialize;

#[allow(unused_imports)]
use tracing::{info, warn};

pub async fn insignia_filter(
    sqlite_pool: Data<SqlitePool>,
    params: Path<InsigParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("insignia_filter {:?}", params.insig);

    let user_id = session::user_id(&session)?;

    let results = if params.insig == 0 {
        vec![]
    } else {
        db::insignia_filter(&sqlite_pool, user_id, params.insig)?
    };

    let res = ResultList { results };
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

pub async fn recently_visited(
    sqlite_pool: Data<SqlitePool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let results = db::recently_visited(&sqlite_pool, user_id)?;

    let res = ResultList { results };
    Ok(HttpResponse::Ok().json(res))
}
/*
pub async fn summarize(
    sqlite_pool: Data<SqlitePool>,
    chatgpt_client: Data<chatgpt::prelude::ChatGPT>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("summarize {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;

    // messages should be initiated with a summarise prompt
    //
    let notes: Vec<Note> = db_notes::get_note_notes(&sqlite_pool, user_id, deck_id)?;
    let contents = order_note_contents(notes)?;
    let simplified_contents = simplify_contents(contents)?;
    let messages = build_summerize_messages(simplified_contents)?;

    let response = openai::chat(chatgpt_client, messages).await?;

    Ok(HttpResponse::Ok().json(response))
}

fn simplify_contents(content: Vec<String>) -> Result<String> {
    Ok(content.join("\n"))
}

fn build_summerize_messages(content: String) -> Result<Vec<interop_dialogues::ChatMessage>> {
    let mut res: Vec<interop_dialogues::ChatMessage> = vec![];

    res.push(interop_dialogues::ChatMessage {
        role: interop_dialogues::Role::System,
        content: "You are a specialist at summarizing data".to_string(),
    });

    let cmd = "Please summarize the following text: ".to_string();

    res.push(interop_dialogues::ChatMessage {
        role: interop_dialogues::Role::User,
        content: cmd + &content,
    });

    Ok(res)
}

fn order_note_contents(notes: Vec<Note>) -> Result<Vec<String>> {
    let num_notes = notes.len();
    let mut res: Vec<String> = vec![];
    let mut i = 0;

    let mut current: Key = 0;
    for note in &notes {
        if note.prev_note_id.is_none() {
            current = note.id;
            res.push(note.content.to_string());
            i += 1;
        }
    }

    if i == 0 {
        warn!("unable to find first note for deck");
        return Err(Error::NotFound);
    } else {
        while i < num_notes {
            if let Some((id, s)) = find_next_note(current, &notes) {
                res.push(s);
                current = id;
            } else {
                warn!("found no note with prev_id: {}", current);
                return Err(Error::NotFound);
            }
            i += 1;
        }
    }

    Ok(res)
}

fn find_next_note(prev_id: Key, notes: &Vec<Note>) -> Option<(Key, String)> {
    for note in notes {
        if let Some(prev) = note.prev_note_id {
            if prev == prev_id {
                return Some((note.id, note.content.to_string()));
            }
        }
    }
    None
}
 */

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
