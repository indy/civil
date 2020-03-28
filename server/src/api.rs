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
                .route("", post().to(historic_people::create_person))
                .route("", get().to(historic_people::get_people))
                .route("/{id}", get().to(historic_people::get_person))
                .route("/{id}", put().to(historic_people::edit_person)) // check
                .route("/{id}", delete().to(historic_people::delete_person)),
        )
        // historic_points
        .service(
            scope("/points")
                .route("", post().to(historic_points::create_point))
                .route("", get().to(historic_points::get_points))
                .route("/{id}", get().to(historic_points::get_point))
                .route("/{id}", put().to(historic_points::edit_point)) // check
                .route("/{id}", delete().to(historic_points::delete_point)),
        )
        // subjects
        .service(
            scope("/subjects")
                .route("", post().to(subjects::create_subject))
                .route("", get().to(subjects::get_subjects))
                .route("/{id}", get().to(subjects::get_subject))
                .route("/{id}", put().to(subjects::edit_subject))
                .route("/{id}", delete().to(subjects::delete_subject)),
        )
        // articles
        .service(
            scope("/articles")
                .route("", post().to(articles::create_article))
                .route("", get().to(articles::get_articles))
                .route("/{id}", get().to(articles::get_article))
                .route("/{id}", put().to(articles::edit_article))
                .route("/{id}", delete().to(articles::delete_article)),
        )
        // books
        .service(
            scope("/books")
                .route("", post().to(books::create_book))
                .route("", get().to(books::get_books))
                .route("/{id}", get().to(books::get_book))
                .route("/{id}", put().to(books::edit_book))
                .route("/{id}", delete().to(books::delete_book)),
        )
        // notes
        .service(
            scope("/notes")
                .route("", post().to(notes::create_note))
                .route("/{id}", get().to(notes::get_note))
                .route("/{id}", put().to(notes::edit_note)) // check
                .route("/{id}", delete().to(notes::delete_note)),
        )
        // notes
        .service(
            scope("/quotes")
                .route("", post().to(notes::create_quote))
                .route("/{id}", get().to(notes::get_quote))
                .route("/{id}", put().to(notes::edit_quote)) // check
                .route("/{id}", delete().to(notes::delete_quote)),
        )
        // edges
        .service(
            scope("/edges")
                .route("/notes_decks", post().to(edges::create_from_note_to_deck))
                .route("/{id}", delete().to(edges::delete_edge)),
        )
        // autocomplete
        .service(
            scope("/autocomplete")
                .route("/people", get().to(autocomplete::get_people))
                .route("/subjects", get().to(autocomplete::get_subjects)),
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
