// Copyright (C) 2020 Inderjit Gill <email@indy.io>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::handle_articles;
use crate::handle_autocomplete;
use crate::handle_historic_people;
use crate::handle_historic_points;
use crate::handle_notes;
use crate::handle_subjects;
use crate::handle_users;
use actix_files::NamedFile;
use actix_web::dev;
use actix_web::middleware::errhandlers::ErrorHandlerResponse;
use actix_web::web::{delete, get, post, put, scope};

pub fn public_api(mount_point: &str) -> actix_web::Scope {
    scope(mount_point)
        // login/logout
        .service(
            scope("/auth")
                .route("", post().to(handle_users::login))
                .route("", delete().to(handle_users::logout)),
        )
        // registration
        .service(
            scope("/users")
                .route("", post().to(handle_users::create_user))
                .route("", get().to(handle_users::get_user)),
        )
        // historic_people
        .service(
            scope("/people")
                .route("", post().to(handle_historic_people::create_person))
                .route("", get().to(handle_historic_people::get_people))
                .route("/{id}", get().to(handle_historic_people::get_person))
                .route("/{id}", put().to(handle_historic_people::edit_person)) // check
                .route("/{id}", delete().to(handle_historic_people::delete_person)),
        )
        // historic_points
        .service(
            scope("/points")
                .route("", post().to(handle_historic_points::create_point))
                .route("", get().to(handle_historic_points::get_points))
                .route("/{id}", get().to(handle_historic_points::get_point))
                .route("/{id}", put().to(handle_historic_points::edit_point)) // check
                .route("/{id}", delete().to(handle_historic_points::delete_point)),
        )
        // subjects
        .service(
            scope("/subjects")
                .route("", post().to(handle_subjects::create_subject))
                .route("", get().to(handle_subjects::get_subjects))
                .route("/{id}", get().to(handle_subjects::get_subject))
                .route("/{id}", put().to(handle_subjects::edit_subject))
                .route("/{id}", delete().to(handle_subjects::delete_subject)),
        )
        // articles
        .service(
            scope("/articles")
                .route("", post().to(handle_articles::create_article))
                .route("", get().to(handle_articles::get_articles))
                .route("/{id}", get().to(handle_articles::get_article))
                .route("/{id}", put().to(handle_articles::edit_article))
                .route("/{id}", delete().to(handle_articles::delete_article)),
        )
        // notes
        .service(
            scope("/notes")
                .route("", post().to(handle_notes::create_note))
                .route("/{id}", get().to(handle_notes::get_note))
                .route("/{id}", put().to(handle_notes::edit_note)) // check
                .route("/{id}", delete().to(handle_notes::delete_note)),
        )
        // notes
        .service(
            scope("/quotes")
                .route("", post().to(handle_notes::create_quote))
                .route("/{id}", get().to(handle_notes::get_quote))
                .route("/{id}", put().to(handle_notes::edit_quote)) // check
                .route("/{id}", delete().to(handle_notes::delete_quote)),
        )
        // autocomplete
        .service(
            scope("/autocomplete")
                .route("/people", get().to(handle_autocomplete::get_people))
                .route("/subjects", get().to(handle_autocomplete::get_subjects)),
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
