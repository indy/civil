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

use crate::handler::articles;
use crate::handler::autocomplete;
use crate::handler::books;
use crate::handler::dashboard;
use crate::handler::edges;
use crate::handler::events;
use crate::handler::ideas;
use crate::handler::notes;
use crate::handler::people;
use crate::handler::search;
use crate::handler::tags;
use crate::handler::users;
use actix_files::NamedFile;
use actix_web::dev;
use actix_web::middleware::errhandlers::ErrorHandlerResponse;
use actix_web::web::{delete, get, post, put, scope};

pub fn public_api(mount_point: &str) -> actix_web::Scope {
    scope(mount_point)
        // login/logout
        .service(
            scope("/auth")
                .route("", post().to(users::login))
                .route("", delete().to(users::logout)),
        )
        // search
        .service(scope("/search").route("", get().to(search::get)))
        // dashboard
        .service(scope("/dashboard").route("", get().to(dashboard::get)))
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
                .route("/{id}", get().to(ideas::get))
                .route("/{id}", put().to(ideas::edit))
                .route("/{id}", delete().to(ideas::delete)),
        )
        // people
        .service(
            scope("/people")
                .route("", post().to(people::create))
                .route("", get().to(people::get_all))
                .route("/{id}", get().to(people::get))
                .route("/{id}", put().to(people::edit)) // check
                .route("/{id}", delete().to(people::delete)),
        )
        // events
        .service(
            scope("/events")
                .route("", post().to(events::create))
                .route("", get().to(events::get_all))
                .route("/{id}", get().to(events::get))
                .route("/{id}", put().to(events::edit)) // check
                .route("/{id}", delete().to(events::delete)),
        )
        // articles
        .service(
            scope("/articles")
                .route("", post().to(articles::create))
                .route("", get().to(articles::get_all))
                .route("/{id}", get().to(articles::get))
                .route("/{id}", put().to(articles::edit))
                .route("/{id}", delete().to(articles::delete)),
        )
        // books
        .service(
            scope("/books")
                .route("", post().to(books::create))
                .route("", get().to(books::get_all))
                .route("/{id}", get().to(books::get))
                .route("/{id}", put().to(books::edit))
                .route("/{id}", delete().to(books::delete)),
        )
        // notes
        .service(
            scope("/notes")
                .route("", post().to(notes::create_notes))
                .route("/{id}", get().to(notes::get_note))
                .route("/{id}", put().to(notes::edit_note))
                .route("/{id}", delete().to(notes::delete_note)),
        )
        // tags
        .service(
            scope("/tags")
                .route("", post().to(tags::create))
                .route("", get().to(tags::get_all))
                .route("/{id}", get().to(tags::get))
                .route("/{id}", put().to(tags::edit))
                .route("/{id}", delete().to(tags::delete)),
        )
        // edges
        .service(
            scope("/edges")
                .route("/notes_decks", post().to(edges::create_from_note_to_decks))
                .route("/notes_tags", post().to(edges::create_from_note_to_tags)),
        )
        // autocomplete
        .service(scope("/autocomplete").route("/decks", get().to(autocomplete::get_decks)))
}

pub fn bad_request<B>(res: dev::ServiceResponse<B>) -> actix_web::Result<ErrorHandlerResponse<B>> {
    let new_resp = NamedFile::open("errors/400.html")?
        .set_status_code(res.status())
        .into_response(res.request())?;
    Ok(ErrorHandlerResponse::Response(
        res.into_response(new_resp.into_body()),
    ))
}

pub fn not_found<B>(res: dev::ServiceResponse<B>) -> actix_web::Result<ErrorHandlerResponse<B>> {
    let new_resp = NamedFile::open("errors/404.html")?
        .set_status_code(res.status())
        .into_response(res.request())?;
    Ok(ErrorHandlerResponse::Response(
        res.into_response(new_resp.into_body()),
    ))
}

pub fn internal_server_error<B>(
    res: dev::ServiceResponse<B>,
) -> actix_web::Result<ErrorHandlerResponse<B>> {
    let new_resp = NamedFile::open("errors/500.html")?
        .set_status_code(res.status())
        .into_response(res.request())?;
    Ok(ErrorHandlerResponse::Response(
        res.into_response(new_resp.into_body()),
    ))
}
