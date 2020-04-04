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
use crate::handler::edges;
use crate::handler::historic_people;
use crate::handler::historic_points;
use crate::handler::notes;
use crate::handler::subjects;
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
        // registration
        .service(
            scope("/users")
                .route("", post().to(users::create_user))
                .route("", get().to(users::get_user)),
        )
        // historic_people
        .service(
            scope("/people")
                .route("", post().to(historic_people::create))
                .route("", get().to(historic_people::get_all))
                .route("/{id}", get().to(historic_people::get))
                .route("/{id}", put().to(historic_people::edit)) // check
                .route("/{id}", delete().to(historic_people::delete)),
        )
        // historic_points
        .service(
            scope("/points")
                .route("", post().to(historic_points::create))
                .route("", get().to(historic_points::get_all))
                .route("/{id}", get().to(historic_points::get))
                .route("/{id}", put().to(historic_points::edit)) // check
                .route("/{id}", delete().to(historic_points::delete)),
        )
        // subjects
        .service(
            scope("/subjects")
                .route("", post().to(subjects::create))
                .route("", get().to(subjects::get_all))
                .route("/{id}", get().to(subjects::get))
                .route("/{id}", put().to(subjects::edit))
                .route("/{id}", delete().to(subjects::delete)),
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
                .route("/{id}", put().to(notes::edit_note)) // check
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
                .route("/notes_tags", post().to(edges::create_from_note_to_tags))
                .route("/{id}", delete().to(edges::delete_edge)),
        )
        // autocomplete
        .service(
            scope("/autocomplete")
                .route("/tags", get().to(autocomplete::get_tags))
                .route("/decks", get().to(autocomplete::get_decks)),
        )
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
