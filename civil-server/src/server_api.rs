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

use crate::handler::cmd;
use crate::handler::edges;
use crate::handler::graph;
use crate::handler::ideas;
use crate::handler::notes;
use crate::handler::people;
use crate::handler::publications;
use crate::handler::sr;
use crate::handler::timelines;
use crate::handler::ubersetup;
use crate::handler::uploader;
use crate::handler::users;
use actix_files::NamedFile;
use actix_web::dev;
use actix_web::middleware::ErrorHandlerResponse;
use actix_web::web::{delete, get, post, put, scope};
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
            scope("/cmd")
                .route("/search", get().to(cmd::search))
                .route("/namesearch", get().to(cmd::namesearch))
                .route("/recent", get().to(cmd::recent))
                .route("/graph", get().to(cmd::graph)),
        )
        // registration
        .service(
            scope("/users")
                .route("", post().to(users::create_user))
                .route("", get().to(users::get_user)),
        )
        // ideas
        .service(
            scope("/ideas")
                .route("", post().to(ideas::create))
                .route("", get().to(ideas::get_all))
                .route("/search", get().to(ideas::search))
                .route("/listings", get().to(ideas::get_listings))
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
                .route("/search", get().to(people::search))
                .route("/listings", get().to(people::get_all))
                .route("/{id}", get().to(people::get))
                .route("/{id}", put().to(people::edit)) // check
                .route("/{id}", delete().to(people::delete))
                .route("/{id}/points", post().to(people::add_point)),
        )
        // timelines
        .service(
            scope("/timelines")
                .route("", post().to(timelines::create))
                .route("", get().to(timelines::get_all))
                .route("/search", get().to(timelines::search))
                .route("/listings", get().to(timelines::get_all))
                .route("/{id}", get().to(timelines::get))
                .route("/{id}", put().to(timelines::edit)) // check
                .route("/{id}", delete().to(timelines::delete))
                .route("/{id}/points", post().to(timelines::add_point)),
        )
        // publications
        .service(
            scope("/publications")
                .route("", post().to(publications::create))
                .route("", get().to(publications::get_all))
                .route("/search", get().to(publications::search))
                .route("/listings", get().to(publications::get_listings))
                .route("/{id}", get().to(publications::get))
                .route("/{id}", put().to(publications::edit))
                .route("/{id}", delete().to(publications::delete)),
        )
        // notes
        .service(
            scope("/notes")
                .route("", post().to(notes::create_notes))
                .route("/{id}", get().to(notes::get_note))
                .route("/{id}", put().to(notes::edit_note))
                .route("/{id}", delete().to(notes::delete_note)),
        )
        // spaced repetition
        .service(
            scope("/sr")
                .route("", post().to(sr::create_card))
                .route("", get().to(sr::get_cards))
                .route("/practice", get().to(sr::get_practice_card))
                .route("/{id}/rated", post().to(sr::card_rated))
                .route("/{id}", put().to(sr::edit))
                .route("/{id}", delete().to(sr::delete)),
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
                .route("", get().to(uploader::get)) // get this user's most recent uploads
                .route("directory", get().to(uploader::get_directory)), // this user's upload directory
        )
}

pub fn bad_request<B>(res: dev::ServiceResponse<B>) -> actix_web::Result<ErrorHandlerResponse<B>> {
    let new_resp = NamedFile::open("errors/400.html")?
        .set_status_code(res.status())
        .into_response(res.request());
    warn!("bad request: {:?} {:?}", &res.status(), &res.request());
    Ok(ErrorHandlerResponse::Response(
        res.into_response(new_resp.into_body()),
    ))
}

pub fn not_found<B>(res: dev::ServiceResponse<B>) -> actix_web::Result<ErrorHandlerResponse<B>> {
    let new_resp = NamedFile::open("errors/404.html")?
        .set_status_code(res.status())
        .into_response(res.request());
    warn!("not found: {:?} {:?}", &res.status(), &res.request());
    Ok(ErrorHandlerResponse::Response(
        res.into_response(new_resp.into_body()),
    ))
}

pub fn internal_server_error<B>(
    res: dev::ServiceResponse<B>,
) -> actix_web::Result<ErrorHandlerResponse<B>> {
    let new_resp = NamedFile::open("errors/500.html")?
        .set_status_code(res.status())
        .into_response(res.request());
    warn!(
        "internal server error: {:?} {:?}",
        &res.status(),
        &res.request()
    );
    Ok(ErrorHandlerResponse::Response(
        res.into_response(new_resp.into_body()),
    ))
}
