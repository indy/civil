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

use actix_files as fs;
use actix_session::CookieSession;
use actix_web::cookie::SameSite;
use actix_web::middleware;
use actix_web::middleware::errhandlers::ErrorHandlers;
use actix_web::{http, web, App, HttpServer};
use civil;
use civil::{server_api, Result, ServerConfig};
use std::env;
use tracing::{error, info};

const SIGNING_KEY_SIZE: usize = 32;

#[actix_rt::main]
async fn main() -> Result<()> {
    civil::init_dotenv();
    civil::init_tracing();
    let pool = civil::init_postgres_pool().await?;

    let port = civil::env_var_string("PORT")?;
    let www_path = civil::env_var_string("WWW_PATH")?;
    let user_content_path = civil::env_var_string("USER_CONTENT_PATH")?;
    let registration_magic_word = civil::env_var_string("REGISTRATION_MAGIC_WORD")?;
    let cookie_secure = civil::env_var_bool("COOKIE_OVER_HTTPS_ONLY")?;

    let session_signing_key = env::var("SESSION_SIGNING_KEY")?;

    let server = HttpServer::new(move || {
        let mut signing_key: &mut [u8] = &mut [0; SIGNING_KEY_SIZE];
        read_signing_key(&mut signing_key, &session_signing_key);
        // info!("signing key: {:?}", signing_key);

        let session_store = CookieSession::private(signing_key)
            .secure(cookie_secure)
            .same_site(SameSite::Strict)
            .max_age(60 * 60 * 24 * 30); // 30 days
        let error_handlers = ErrorHandlers::new()
            .handler(
                http::StatusCode::INTERNAL_SERVER_ERROR,
                server_api::internal_server_error,
            )
            .handler(http::StatusCode::BAD_REQUEST, server_api::bad_request)
            .handler(http::StatusCode::NOT_FOUND, server_api::not_found);

        App::new()
            .data(pool.clone())
            .data(ServerConfig {
                user_content_path: user_content_path.clone(),
                registration_magic_word: registration_magic_word.clone(),
            })
            .data(web::JsonConfig::default().limit(1024 * 1024))
            .wrap(middleware::DefaultHeaders::new().header("Cache-control", "no-cache"))
            .wrap(session_store)
            .wrap(error_handlers)
            .service(server_api::public_api("/api"))
            .service(fs::Files::new("/u", &user_content_path))
            .service(fs::Files::new("/", &www_path).index_file("index.html"))
    })
    .bind(format!("127.0.0.1:{}", port))?
    .run();

    info!("local server running on port: {}", port);

    server.await?;

    Ok(())
}

fn read_signing_key(signing_key: &mut [u8], session_signing_key: &str) {
    // check string against twice the SIGNING_KEY_SIZE since we
    // need 2 characters to represent all byte values (00 -> ff)
    //
    if session_signing_key.len() != (SIGNING_KEY_SIZE * 2) {
        error!(
            "SESSION_SIGNING_KEY in .env has to be 32 bytes (currently: {})",
            session_signing_key.len()
        );
    }

    let mut b = session_signing_key.bytes();

    for elem in signing_key.iter_mut().take(SIGNING_KEY_SIZE) {
        let ascii_hex_0 = b.next().unwrap();
        let ascii_hex_1 = b.next().unwrap();

        let d0 = ascii_hex_digit_to_dec(ascii_hex_0);
        let d1 = ascii_hex_digit_to_dec(ascii_hex_1);

        *elem = (d0 * 16) + d1;
    }
}

fn ascii_hex_digit_to_dec(ascii_hex: u8) -> u8 {
    match ascii_hex {
        48 => 0,   // asci 0
        49 => 1,   // asci 1
        50 => 2,   // asci 2
        51 => 3,   // asci 3
        52 => 4,   // asci 4
        53 => 5,   // asci 5
        54 => 6,   // asci 6
        55 => 7,   // asci 7
        56 => 8,   // asci 8
        57 => 9,   // asci 9
        97 => 10,  // ascii a
        98 => 11,  // ascii b
        99 => 12,  // ascii c
        100 => 13, // ascii d
        101 => 14, // ascii e
        102 => 15, // ascii f
        _ => 0,
    }
}
