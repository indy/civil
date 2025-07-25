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

use crate::interop::Key;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginCredentials {
    pub email: String,
    pub password: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Registration {
    pub username: String,
    pub email: String,
    pub password: String,
    pub ui_config: String,
    pub magic_word: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub username: String,
    pub email: String,
    pub admin: Option<Admin>,
    pub ui_config_json: String,
}

pub struct UserId {
    pub id: Key,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Admin {
    pub db_name: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditUiConfig {
    pub json: String,
}
