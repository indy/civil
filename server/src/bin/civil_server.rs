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
use actix_session::{config::PersistentSession, storage::CookieSessionStore, SessionMiddleware};
use actix_web::cookie::{self, Key, SameSite};
use actix_web::middleware::{self, ErrorHandlers};
use actix_web::{http, web, App, HttpServer};
use civil_server::{self, server_api, ServerConfig};
use std::env;
use tracing::{error, info};

const SIGNING_KEY_SIZE: usize = 64;

use r2d2_sqlite::SqliteConnectionManager;

#[actix_rt::main]
async fn main() -> civil_server::Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();

    let sqlite_db = civil_server::env_var_string_or("SQLITE_DB", "civil.db");
    let port = civil_server::env_var_string_or("PORT", "3002");
    let www_path = civil_server::env_var_string_or("WWW_PATH", "www");
    let user_content_path = civil_server::env_var_string_or("USER_CONTENT_PATH", "user-content");
    let cookie_secure = civil_server::env_var_bool_or("COOKIE_OVER_HTTPS_ONLY", false);

    info!("SQLITE_DB: {}", sqlite_db);
    info!("PORT: {}", port);
    info!("WWW_PATH: {}", www_path);
    info!("USER_CONTENT_PATH: {}", user_content_path);
    info!("COOKIE_OVER_HTTPS_ONLY: {}", cookie_secure);

    let registration_magic_word = civil_server::env_var_string("REGISTRATION_MAGIC_WORD")?;
    let session_signing_key = env::var("SESSION_SIGNING_KEY")?;

    civil_server::db::sqlite_migrations::migration_check(&sqlite_db)?;

    let sqlite_manager = SqliteConnectionManager::file(&sqlite_db);
    let sqlite_pool = r2d2::Pool::new(sqlite_manager)?;

    let openai_key = civil_server::env_var_string("OPENAI_KEY")?;
    let ai = civil_server::ai::AI::new(openai_key)?;

    let server = HttpServer::new(move || {
        let signing_key: &mut [u8] = &mut [0; SIGNING_KEY_SIZE];
        read_signing_key(signing_key, &session_signing_key);
        // info!("signing key: {:?}", signing_key);

        let session_store =
            SessionMiddleware::builder(CookieSessionStore::default(), Key::from(signing_key))
                .cookie_secure(cookie_secure)
                .cookie_same_site(SameSite::Strict)
                .session_lifecycle(
                    PersistentSession::default().session_ttl(cookie::time::Duration::days(30)),
                )
                .build();

        let error_handlers = ErrorHandlers::new()
            .handler(
                http::StatusCode::INTERNAL_SERVER_ERROR,
                server_api::internal_server_error,
            )
            .handler(http::StatusCode::BAD_REQUEST, server_api::bad_request)
            .handler(http::StatusCode::NOT_FOUND, server_api::not_found);

        App::new()
            .app_data(web::Data::new(sqlite_pool.clone()))
            .app_data(web::Data::new(ai.clone()))
            .app_data(web::Data::new(ServerConfig {
                user_content_path: user_content_path.clone(),
                registration_magic_word: registration_magic_word.clone(),
            }))
            .app_data(web::JsonConfig::default().limit(1024 * 1024))
            .wrap(middleware::DefaultHeaders::new().add(("Cache-control", "no-cache")))
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
            "SESSION_SIGNING_KEY in .env has to be {} characters long (currently: {})",
            SIGNING_KEY_SIZE * 2,
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
    //
    // |-----+-------+-----|
    // | hex | ascii | dec |
    // |-----+-------+-----|
    // |   0 |    48 |   0 |
    // |   1 |    49 |   1 |
    // |   2 |    50 |   2 |
    // |   3 |    51 |   3 |
    // |   4 |    52 |   4 |
    // |   5 |    53 |   5 |
    // |   6 |    54 |   6 |
    // |   7 |    55 |   7 |
    // |   8 |    56 |   8 |
    // |   9 |    57 |   9 |
    // |   a |    97 |  10 |
    // |   b |    98 |  11 |
    // |   c |    99 |  12 |
    // |   d |   100 |  13 |
    // |   e |   101 |  14 |
    // |   f |   102 |  15 |
    // |-----+-------+-----|
    //
    if (b'0'..=b'9').contains(&ascii_hex) {
        ascii_hex - b'0'
    } else if (b'a'..=b'f').contains(&ascii_hex) {
        ascii_hex - b'a' + 10
    } else if (b'A'..=b'F').contains(&ascii_hex) {
        ascii_hex - b'A' + 10
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ascii_hex_digit_to_dec_handles_cases() {
        assert_eq!(ascii_hex_digit_to_dec(b'0'), 0);
        assert_eq!(ascii_hex_digit_to_dec(b'9'), 9);
        assert_eq!(ascii_hex_digit_to_dec(b'a'), 10);
        assert_eq!(ascii_hex_digit_to_dec(b'f'), 15);
        assert_eq!(ascii_hex_digit_to_dec(b'A'), 10);
        assert_eq!(ascii_hex_digit_to_dec(b'F'), 15);
    }
}
