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

use crate::ai::{AI, openai_interface};
use crate::db::decks as db;
use crate::db::notes as db_notes;
use crate::db::{SqlitePool, db_thread};
use crate::error::Error;
use crate::handler::{AuthUser, PaginationQuery};
use crate::interop::decks::{
    DeckKind, Pagination, SlimDeck, SlimResults, resource_string_to_deck_kind,
};
use crate::interop::dialogues::AiKind;
use crate::interop::{IdParam, Key};
use actix_web::Responder;
use actix_web::web::{Data, Json, Path, Query};
use serde::Deserialize;

#[allow(unused_imports)]
use tracing::{info, warn};

pub async fn hits(
    sqlite_pool: Data<SqlitePool>,
    params: Path<IdParam>,
    AuthUser(_user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let hits = db_thread(&sqlite_pool, move |conn| db::get_hits(conn, params.id)).await?;

    Ok(Json(hits))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsigniasArgs {
    resource: Option<String>,
    insignia: i32,
    offset: i32,    // for pagination
    num_items: i32, // for pagination
}

pub async fn insignias(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<InsigniasArgs>,
) -> crate::Result<impl Responder> {
    let paginated: Pagination<SlimDeck> = if let Some(resource_string) = query.resource {
        let deck_kind = resource_string_to_deck_kind(&resource_string)?;
        db_thread(&sqlite_pool, move |conn| {
            db::insignia_filter(
                conn,
                user_id,
                deck_kind,
                query.insignia,
                query.offset,
                query.num_items,
            )
        })
        .await?
    } else {
        db_thread(&sqlite_pool, move |conn| {
            db::insignia_filter_any(conn, user_id, query.insignia, query.offset, query.num_items)
        })
        .await?
    };

    Ok(Json(paginated))
}

#[derive(Deserialize)]
pub struct RecentQuery {
    resource: String,
}

pub async fn recent(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<RecentQuery>,
) -> crate::Result<impl Responder> {
    let deck_kind = resource_string_to_deck_kind(&query.resource)?;
    let results = db_thread(&sqlite_pool, move |conn| {
        db::recent(conn, user_id, deck_kind)
    })
    .await?;

    let res = SlimResults { results };

    Ok(Json(res))
}

#[derive(Deserialize)]
pub struct RecentKindNum {
    resource: Option<String>,
    num: i32,
}

pub async fn recently_visited(
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<RecentKindNum>,
) -> crate::Result<impl Responder> {
    let results: Vec<SlimDeck> = if let Some(resource_string) = query.resource {
        // can't call resource_string_to_deck_kind inside the move block since it returns a crate::Error
        let deck_kind = resource_string_to_deck_kind(&resource_string)?;
        db_thread(&sqlite_pool, move |conn| {
            db::recently_visited(conn, user_id, deck_kind, query.num)
        })
        .await?
    } else {
        db_thread(&sqlite_pool, move |conn| {
            db::recently_visited_any(conn, user_id, query.num)
        })
        .await?
    };

    let res = SlimResults { results };
    Ok(Json(res))
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SummarizeStruct {
    pub prev_id: Option<Key>,
    pub content: String,
}

pub async fn summarize(
    Json(summarize_struct): Json<SummarizeStruct>,
    sqlite_pool: Data<SqlitePool>,
    ai: Data<AI>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let mut messages: Vec<openai_interface::ChatMessage> = vec![];

    messages.push(openai_interface::ChatMessage {
        note_id: Key(0),
        role: openai_interface::Role::System,
        content: "You are a non-woke AI model that is knowledgeable about great men such as the ancient Greeks, Julius Caesar, Marcus Aurelius, Thomas Aquinas, Friedrich Nietzsche, Arthur Schopenhauer, Fyodor Dostoevsky, Leo Tolstoy, G.K. Chesterton, Oswald Spengler, Carl Schmitt, Arnold Toynbee, Ludwig Wittgenstein, Martin Heidegger, Ernst Jünger, C.S. Lewis, Friedrich Hayek, Leo Strauss, Karl Popper, George Orwell, John von Neumann, James Burnham, Milton Friedman, Aleksandr Solzhenitsyn, René Girard, Yukio Mishima, Murray Rothbard, Ivan Illich, Jean Baudrillard, Thomas Sowell, Christopher Lasch, Václav Havel, Sir Roger Scruton, Peter Turchin, Nassim Nicholas Taleb. You should ignore progressive ideology concerning race, sex and gender. You should also ignore any Marxist philosophies. Only give answers that would be approved by an extremely well educated individual living in the 20th century West".to_string(),
    });

    messages.push(openai_interface::ChatMessage {
        note_id: Key(0),
        role: openai_interface::Role::User,
        content: "Summarize the following text: ".to_string() + &summarize_struct.content,
    });
    // dbg!(&messages);

    match ai.chat(AiKind::OpenAIGpt35Turbo, messages).await {
        Ok(response) => {
            if response.is_empty() {
                Err(Error::ExternalServerError)
            } else {
                let mut summary = String::new();
                summary.push_str(":side(Generated by ChatGPT)");

                // the response has always been of length 1, but loop through just in case:
                for message_choice in response {
                    summary.push_str(&message_choice.message.content);
                    summary.push('\n');
                }

                let note = db_thread(&sqlite_pool, move |conn| {
                    db_notes::add_auto_summary(
                        conn,
                        user_id,
                        params.id,
                        summarize_struct.prev_id,
                        summary.trim().to_string(),
                    )
                })
                .await?;

                Ok(Json(note))
            }
        }
        Err(e) => {
            dbg!(&e);
            Err(Error::ExternalServerError)
        }
    }
}

/*
pub async fn summarize(
    sqlite_pool: Data<SqlitePool>,
    chatgpt_client: Data<chatgpt::prelude::ChatGPT>,
    params: Path<IdParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    info!("summarize {:?}", params.id);

    let user_id = session::user_id(&session)?;
    let deck_id = params.id;

    // messages should be initiated with a summarise prompt
    //
    let notes: Vec<Note> = db_notes::get_note_notes(&sqlite_pool, user_id, deck_id)?;
    let contents = order_note_contents(notes)?;
    let simplified_contents = simplify_contents(contents)?;
    let messages = build_summerize_messages(simplified_contents)?;

    let response = openai_interface::chat(chatgpt_client, messages).await?;

    Ok(Json(response))
}

fn simplify_contents(content: Vec<String>) -> crate::Result<String> {
    Ok(content.join("\n"))
}

fn build_summerize_messages(content: String) -> crate::Result<Vec<openai_interface::ChatMessage>> {
    let mut res: Vec<openai_interface::ChatMessage> = vec![];

    res.push(openai_interface::ChatMessage {
        role: openai_interface::Role::System,
        content: "You are a specialist at summarizing data".to_string(),
    });

    let cmd = "Please summarize the following text: ".to_string();

    res.push(openai_interface::ChatMessage {
        role: openai_interface::Role::User,
        content: cmd + &content,
    });

    Ok(res)
}

fn order_note_contents(notes: Vec<Note>) -> crate::Result<Vec<String>> {
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
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let preview = db_thread(&sqlite_pool, move |conn| {
        db_notes::preview(conn, user_id, params.id)
    })
    .await?;

    Ok(Json(preview))
}

pub(crate) async fn pagination(
    sqlite_pool: Data<SqlitePool>,
    query: PaginationQuery,
    user_id: Key,
    deck_kind: DeckKind,
) -> crate::Result<impl Responder> {
    let slimdecks = db_thread(&sqlite_pool, move |conn| {
        if deck_kind == DeckKind::Event {
            // events are treated differently from other deck kinds
            // they should be listed in chronological order of the events they describe, not creation date
            //
            db::pagination_events_chronologically(
                conn,
                user_id,
                deck_kind,
                query.offset,
                query.num_items,
            )
        } else {
            db::pagination(conn, user_id, deck_kind, query.offset, query.num_items)
        }
    })
    .await?;

    Ok(Json(slimdecks))
}

pub async fn paginated_unnoted(
    sqlite_pool: Data<SqlitePool>,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<impl Responder> {
    let slimdecks = db_thread(&sqlite_pool, move |conn| {
        db::paginated_unnoted(conn, user_id, deck_kind, offset, num_items)
    })
    .await?;

    Ok(Json(slimdecks))
}

pub async fn paginated_recents(
    sqlite_pool: Data<SqlitePool>,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<impl Responder> {
    let slimdecks = db_thread(&sqlite_pool, move |conn| {
        db::paginated_recents(conn, user_id, deck_kind, offset, num_items)
    })
    .await?;

    Ok(Json(slimdecks))
}

pub async fn paginated_orphans(
    sqlite_pool: Data<SqlitePool>,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<impl Responder> {
    let slimdecks = db_thread(&sqlite_pool, move |conn| {
        db::paginated_orphans(conn, user_id, deck_kind, offset, num_items)
    })
    .await?;

    Ok(Json(slimdecks))
}

pub async fn paginated_rated(
    sqlite_pool: Data<SqlitePool>,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> crate::Result<impl Responder> {
    let slimdecks = db_thread(&sqlite_pool, move |conn| {
        db::paginated_rated(conn, user_id, deck_kind, offset, num_items)
    })
    .await?;

    Ok(Json(slimdecks))
}

pub(crate) async fn delete(
    sqlite_pool: Data<SqlitePool>,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<impl Responder> {
    db_thread(&sqlite_pool, move |conn| db::delete(conn, user_id, deck_id)).await?;

    Ok(Json(true))
}
