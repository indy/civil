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

use civil_server::{note_parser_api, Result};

use r2d2_sqlite::SqliteConnectionManager;
use tracing::info;

#[actix_rt::main]
async fn main() -> Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();

    let sqlite_db = civil_server::env_var_string("SQLITE_DB")?;
    civil_server::db::sqlite_migrations::migration_check(&sqlite_db)?;

    let sqlite_manager = SqliteConnectionManager::file(&sqlite_db);
    let sqlite_pool = r2d2::Pool::new(sqlite_manager)?;

    info!("started parsing all note markup");
    let notes = note_parser_api::get_all_notes_in_db(&sqlite_pool)?;

    let mut num_elements: usize = 0;

    let mut c: usize = 0;

    for note in notes {
        // if c > 21600 {
        //     info!("content = {:?}", &note);
        // }

        let res = civil_shared::markup_as_struct(&note.content)?;
        num_elements += res.len();
        c += 1;

        if c % 1000 == 0 {
            info!("count: {}", c);
        }
    }
    info!("finished parsing all note markup {}", num_elements);

    Ok(())
}
