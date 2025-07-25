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

pub mod ai;
pub mod db;
mod error;
mod handler;
pub mod interop;
pub mod note_parser_api;
pub mod server_api;
mod session;
pub mod stat_api;

pub use crate::error::Error;

pub type Result<T> = ::std::result::Result<T, error::Error>;

pub struct ServerConfig {
    pub user_content_path: String,
    pub registration_magic_word: String,
}

use std::env;
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

pub fn init_dotenv() {
    dotenv::dotenv().ok();
}

pub fn init_tracing() {
    // a builder for `FmtSubscriber`.
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::DEBUG)
        .finish();

    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");
}

pub fn env_var_string(key: &str) -> crate::Result<String> {
    match env::var(key) {
        Ok(r) => Ok(r),
        Err(e) => Err(Error::Var(e)),
    }
}

pub fn env_var_string_or(key: &str, default: &str) -> String {
    match env::var(key) {
        Ok(r) => r,
        Err(_e) => default.to_string(),
    }
}

pub fn env_var_bool(key: &str) -> crate::Result<bool> {
    Ok(env_var_string(key)? == "true")
}

pub fn env_var_bool_or(key: &str, default: bool) -> bool {
    match env_var_string(key) {
        Ok(r) => r == "true",
        Err(_e) => default,
    }
}
