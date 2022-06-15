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

pub mod db;
mod error;
mod handler;
mod interop;
pub mod note_parser_api;
pub mod server_api;
mod session;
pub mod stat_api;

pub use crate::error::{Error, Result};

pub struct ServerConfig {
    pub user_content_path: String,
    pub registration_magic_word: String,
}

use deadpool_postgres::{Pool, Runtime};
use dotenv;
use std::env;
use tokio_postgres::NoTls;
use tracing::error;
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

pub fn init_dotenv() {
    dotenv::dotenv().ok();
}

pub fn init_tracing() {
    // a builder for `FmtSubscriber`.
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::TRACE)
        .finish();

    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");
}

pub async fn init_postgres_pool() -> Result<Pool> {
    let postgres_db = env_var_string("POSTGRES_DB")?;
    let postgres_host = env_var_string("POSTGRES_HOST")?;
    let postgres_user = env_var_string("POSTGRES_USER")?;
    let postgres_password = env_var_string("POSTGRES_PASSWORD")?;

    let cfg = deadpool_postgres::Config {
        user: Some(String::from(&postgres_user)),
        password: Some(String::from(&postgres_password)),
        dbname: Some(String::from(&postgres_db)),
        host: Some(String::from(&postgres_host)),
        ..Default::default()
    };

    let pool: Pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)?;

    // crash on startup if no database connection can be established
    let _ = pool.get().await?;

    Ok(pool)
}

pub fn env_var_string(key: &str) -> Result<String> {
    match env::var(key) {
        Ok(r) => Ok(r),
        Err(e) => {
            error!("Error unable to get environment variable: {}", key);
            Err(Error::Var(e))
        }
    }
}

pub fn env_var_bool(key: &str) -> Result<bool> {
    Ok(env_var_string(key)? == "true")
}
