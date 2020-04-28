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

use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Note {
    pub id: Key,
    pub content: String,
    pub title: Option<String>,
    pub separator: bool,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateNote {
    pub title: Option<String>,
    pub content: Vec<String>,
    pub separator: bool,

    pub deck_id: Key,
}
