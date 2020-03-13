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
use crate::handle_dates;
use crate::handle_historic_people;
use crate::handle_historic_points;
use crate::handle_locations;
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
                .route("", post().to(handle_historic_people::create_person)) // todo
                .route("", get().to(handle_historic_people::get_people))
                .route("/{id}", get().to(handle_historic_people::get_person))
                .route("/{id}", put().to(handle_historic_people::edit_person)) // todo
                .route("/{id}", delete().to(handle_historic_people::delete_person)), // check
        )
        // historic_points
        .service(
            scope("/points")
                .route("", post().to(handle_historic_points::create_point)) // todo
                .route("", get().to(handle_historic_points::get_points)) // todo
                .route("/{id}", get().to(handle_historic_points::get_point)) // todo
                .route("/{id}", put().to(handle_historic_points::edit_point)) // todo
                .route("/{id}", delete().to(handle_historic_points::delete_point)), // check
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
        // .service(
        //     scope("/notes")
        //         .route("", post().to(handle_notes::create_note)) // todo
        //         .route("", get().to(handle_notes::get_notes)) // todo
        //         .route("/{id}", get().to(handle_notes::get_note)) // todo
        //         .route("/{id}", put().to(handle_notes::edit_note)) // todo
        //         .route("/{id}", delete().to(handle_notes::delete_note)), // check
        // )
        // dates
        .service(
            scope("/dates")
                .route("", post().to(handle_dates::create_date))
                .route("/{id}", get().to(handle_dates::get_date))
                .route("/{id}", put().to(handle_dates::edit_date))
                .route("/{id}", delete().to(handle_dates::delete_date)),
        )
        // locations
        .service(
            scope("/locations")
                .route("", post().to(handle_locations::create_location))
                .route("/{id}", get().to(handle_locations::get_location))
                .route("/{id}", put().to(handle_locations::edit_location))
                .route("/{id}", delete().to(handle_locations::delete_location)),
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
