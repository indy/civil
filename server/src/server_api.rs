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

use crate::handler::articles;
use crate::handler::bookmarks;
use crate::handler::decks;
use crate::handler::dialogues;
use crate::handler::edges;
use crate::handler::events;
use crate::handler::graph;
use crate::handler::ideas;
use crate::handler::memorise;
use crate::handler::notes;
use crate::handler::people;
use crate::handler::quotes;
use crate::handler::timelines;
use crate::handler::ubersetup;
use crate::handler::uploader;
use crate::handler::users;
use actix_files::NamedFile;
use actix_web::middleware::ErrorHandlerResponse;
use actix_web::web::{delete, get, post, put, scope};
use actix_web::{dev, Responder};
use std::env;
use tracing::warn;

pub fn public_api(mount_point: &str) -> actix_web::Scope {
    scope(mount_point)
        // login/logout
        .service(
            scope("/auth")
                .route("", post().to(users::login))
                .route("", delete().to(users::logout)),
        )
        // console commands
        .service(
            scope("/decks")
                .route("/search", get().to(decks::search))
                .route("/namesearch", get().to(decks::namesearch))
                .route("/recent", get().to(decks::recent))
                .route("/insignia_filter/{insig}", get().to(decks::insignia_filter))
                .route("/recently_visited", get().to(decks::recently_visited))
                .route("/summarize/{id}", post().to(decks::summarize))
                .route("/preview/{id}", get().to(decks::preview)),
        )
        // registration
        .service(
            scope("/users")
                .route("/ui_config", put().to(users::edit_ui_config))
                .route("", post().to(users::create_user))
                .route("", get().to(users::get_user)),
        )
        // ideas
        .service(
            scope("/ideas")
                .route("", post().to(ideas::create))
                .route("", get().to(ideas::get_all))
                .route("/listings", get().to(ideas::get_listings))
                .route("/pagination", get().to(ideas::pagination))
                .route("/recent", get().to(ideas::recent))
                .route("/orphans", get().to(ideas::orphans))
                .route("/unnoted", get().to(ideas::unnoted))
                .route("/{id}", get().to(ideas::get))
                .route(
                    "/{id}/additional_search",
                    get().to(ideas::additional_search),
                )
                .route("/{id}", put().to(ideas::edit))
                .route("/{id}", delete().to(ideas::delete)),
        )
        // people
        .service(
            scope("/people")
                .route("", post().to(people::create))
                .route("", get().to(people::get_all))
                .route("/listings", get().to(people::get_listings))
                .route("/pagination", get().to(people::pagination))
                .route("/{id}", get().to(people::get))
                .route(
                    "/{id}/additional_search",
                    get().to(people::additional_search),
                )
                .route("/{id}", put().to(people::edit)) // check
                .route("/{id}", delete().to(people::delete))
                .route("/{id}/points", post().to(people::add_point))
                .route("/{id}/multipoints", post().to(people::add_multipoints)),
        )
        // quotes
        .service(
            scope("/quotes")
                .route("", post().to(quotes::create))
                .route("/random", get().to(quotes::random))
                .route("/pagination", get().to(quotes::pagination))
                .route("/{id}", get().to(quotes::get))
                .route("/{id}", put().to(quotes::edit))
                .route("/{id}", delete().to(quotes::delete))
                .route("/{id}/next", get().to(quotes::next))
                .route("/{id}/prev", get().to(quotes::prev)),
        )
        // timelines
        .service(
            scope("/timelines")
                .route("", post().to(timelines::create))
                .route("", get().to(timelines::get_all))
                .route("/listings", get().to(timelines::get_all))
                .route("/pagination", get().to(timelines::pagination))
                .route("/{id}", get().to(timelines::get))
                .route("/{id}", put().to(timelines::edit)) // check
                .route("/{id}", delete().to(timelines::delete))
                .route("/{id}/points", post().to(timelines::add_point))
                .route("/{id}/multipoints", post().to(timelines::add_multipoints)),
        )
        // events
        .service(
            scope("/events")
                .route("", post().to(events::create))
                .route("", get().to(events::get_all))
                .route("/listings", get().to(events::get_all))
                .route("/pagination", get().to(events::pagination))
                .route("/{id}", get().to(events::get))
                .route("/{id}", put().to(events::edit))
                .route("/{id}", delete().to(events::delete)),
        )
        // articles
        .service(
            scope("/articles")
                .route("", post().to(articles::create))
                .route("", get().to(articles::get_all))
                .route("/listings", get().to(articles::get_listings))
                .route("/pagination", get().to(articles::pagination))
                .route("/{id}", get().to(articles::get))
                .route("/{id}", put().to(articles::edit))
                .route("/{id}", delete().to(articles::delete)),
        )
        // dialogues
        .service(
            scope("/dialogues")
                .route("/chat", post().to(dialogues::chat))
                .route("", post().to(dialogues::create))
                .route("", get().to(dialogues::get_all))
                .route("/pagination", get().to(dialogues::pagination))
                .route("/{id}/chat", post().to(dialogues::converse))
                .route("/{id}", get().to(dialogues::get))
                .route("/{id}", put().to(dialogues::edit))
                .route("/{id}", delete().to(dialogues::delete)),
        )
        // notes
        .service(
            scope("/notes")
                .route("", post().to(notes::create_notes))
                .route("/{id}", get().to(notes::get_note))
                .route("/{id}", put().to(notes::edit_note))
                .route("/{id}", delete().to(notes::delete_note)),
        )
        // bookmarks
        .service(
            scope("/bookmarks")
                .route("", post().to(bookmarks::create_bookmark))
                .route("/multi", post().to(bookmarks::create_multiple_bookmarks))
                .route("", get().to(bookmarks::get_bookmarks))
                .route("/{id}", delete().to(bookmarks::delete_bookmark)),
        )
        // spaced repetition
        .service(
            scope("/memorise")
                .route("", post().to(memorise::create_card))
                .route("", get().to(memorise::get_cards))
                .route("/practice", get().to(memorise::get_practice_card))
                .route("/{id}/rated", post().to(memorise::card_rated))
                .route("/{id}", put().to(memorise::edit))
                .route("/{id}", delete().to(memorise::delete)),
        )
        // setup
        .service(scope("/ubersetup").route("", get().to(ubersetup::setup)))
        // edges
        .service(scope("/edges").route("/notes_decks", post().to(edges::create_from_note_to_decks)))
        // graph
        .service(scope("/graph").route("", get().to(graph::get)))
        // upload
        .service(
            scope("/upload")
                .route("", post().to(uploader::create)) // upload images
                .route("/{at_least}", get().to(uploader::get)) // get this user's most recent uploads
                .route("directory", get().to(uploader::get_directory)), // this user's upload directory
        )
}

pub fn bad_request<B>(res: dev::ServiceResponse<B>) -> actix_web::Result<ErrorHandlerResponse<B>> {
    warn!("bad request: {:?} {:?}", &res.status(), &res.request());
    let www = env::var("WWW_PATH").expect("unable to resolve WWW_PATH");
    let new_resp = NamedFile::open(format!("{}/errors/400.html", www))?
        .customize()
        .with_status(res.status())
        .respond_to(res.request())
        .map_into_boxed_body()
        .map_into_right_body();
    Ok(ErrorHandlerResponse::Response(res.into_response(new_resp)))
}

pub fn not_found<B>(res: dev::ServiceResponse<B>) -> actix_web::Result<ErrorHandlerResponse<B>> {
    warn!("not found: {:?} {:?}", &res.status(), &res.request());
    let www = env::var("WWW_PATH").expect("unable to resolve WWW_PATH");
    let new_resp = NamedFile::open(format!("{}/errors/404.html", www))?
        .customize()
        .with_status(res.status())
        .respond_to(res.request())
        .map_into_boxed_body()
        .map_into_right_body();
    Ok(ErrorHandlerResponse::Response(res.into_response(new_resp)))
}

pub fn internal_server_error<B>(
    res: dev::ServiceResponse<B>,
) -> actix_web::Result<ErrorHandlerResponse<B>> {
    warn!(
        "internal server error: {:?} {:?}",
        &res.status(),
        &res.request()
    );

    let www = env::var("WWW_PATH").expect("unable to resolve WWW_PATH");
    let new_resp = NamedFile::open(format!("{}/errors/500.html", www))?
        .customize()
        .with_status(res.status())
        .respond_to(res.request())
        .map_into_boxed_body()
        .map_into_right_body();
    Ok(ErrorHandlerResponse::Response(res.into_response(new_resp)))
}
