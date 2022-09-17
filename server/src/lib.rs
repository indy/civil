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
pub mod interop;
pub mod note_linked_list_api;
pub mod note_parser_api;
pub mod server_api;
mod session;
pub mod stat_api;

pub use crate::error::{Error, Result};

pub struct ServerConfig {
    pub user_content_path: String,
    pub registration_magic_word: String,
}

use dotenv;
use std::env;
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

pub fn env_var_string(key: &str) -> Result<String> {
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

pub fn env_var_bool(key: &str) -> Result<bool> {
    Ok(env_var_string(key)? == "true")
}

pub fn env_var_bool_or(key: &str, default: bool) -> bool {
    match env_var_string(key) {
        Ok(r) => r == "true",
        Err(_e) => default,
    }
}
