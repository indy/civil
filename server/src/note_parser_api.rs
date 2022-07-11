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

use crate::db::notes as notes_db;
use crate::db::sqlite::SqlitePool;
use crate::error::Result;
use crate::interop::notes::Note;

pub fn get_all_notes_in_db(sqlite_pool: &SqlitePool) -> Result<Vec<Note>> {
    notes_db::get_all_notes_in_db(sqlite_pool)
}
