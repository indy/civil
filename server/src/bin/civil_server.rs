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
use actix_session::{SessionMiddleware, config::PersistentSession, storage::CookieSessionStore};
use actix_web::cookie::{self, Key, SameSite};
use actix_web::middleware::{self, ErrorHandlers};
use actix_web::{App, HttpServer, http, web};
use civil_server::{self, ServerConfig, server_api};
use rusqlite::Connection;
use std::env;
use tracing::info;

const SIGNING_KEY_SIZE: usize = 64;

use r2d2_sqlite::SqliteConnectionManager;

fn configure(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA foreign_keys=ON;
         PRAGMA busy_timeout=5000;",
    )
}

#[actix_web::main]
async fn main() -> civil_server::Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();

    let sqlite_db = civil_server::env_var_string_or("SQLITE_DB", "civil.db");
    let port = civil_server::env_var_string_or("PORT", "3002");
    let www_path = civil_server::env_var_string_or("WWW_PATH", "www");
    let user_content_path = civil_server::env_var_string_or("USER_CONTENT_PATH", "user-content");
    let cookie_secure = civil_server::env_var_bool_or("COOKIE_OVER_HTTPS_ONLY", true);

    info!("SQLITE_DB: {}", sqlite_db);
    info!("PORT: {}", port);
    info!("WWW_PATH: {}", www_path);
    info!("USER_CONTENT_PATH: {}", user_content_path);
    info!("COOKIE_OVER_HTTPS_ONLY: {}", cookie_secure);

    let registration_magic_word = civil_server::env_var_string("REGISTRATION_MAGIC_WORD")?;
    let session_signing_key = parse_session_signing_key(&env::var("SESSION_SIGNING_KEY")?)?;

    civil_server::db::sqlite_migrations::migration_check(&sqlite_db)?;

    let sqlite_manager = SqliteConnectionManager::file(&sqlite_db).with_init(|c| configure(c));
    // let sqlite_pool = r2d2::Pool::new(sqlite_manager)?;
    let sqlite_pool = r2d2::Pool::builder()
        .max_size(16) // keep modest; SQLite is single-writer
        .build(sqlite_manager)?;

    let openai_key = civil_server::env_var_string("OPENAI_KEY")?;
    let ai = civil_server::ai::AI::new(openai_key)?;

    let server = HttpServer::new(move || {
        let session_store =
            SessionMiddleware::builder(CookieSessionStore::default(), session_signing_key.clone())
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

fn parse_session_signing_key(session_signing_key: &str) -> civil_server::Result<Key> {
    if session_signing_key.len() != (SIGNING_KEY_SIZE * 2) {
        return Err(civil_server::Error::InvalidSessionSigningKeyLength {
            expected: SIGNING_KEY_SIZE * 2,
            found: session_signing_key.len(),
        });
    }

    let mut signing_key = [0u8; SIGNING_KEY_SIZE];

    for (i, chunk) in session_signing_key.as_bytes().chunks_exact(2).enumerate() {
        let high = hex_digit(chunk[0])?;
        let low = hex_digit(chunk[1])?;

        signing_key[i] = (high << 4) | low;
    }

    Ok(Key::from(signing_key))
}

fn hex_digit(digit: u8) -> civil_server::Result<u8> {
    match digit {
        b'0'..=b'9' => Ok(digit - b'0'),
        b'a'..=b'f' => Ok(digit - b'a' + 10),
        b'A'..=b'F' => Ok(digit - b'A' + 10),
        _ => Err(civil_server::Error::InvalidSessionSigningKeyFormat),
    }
}
