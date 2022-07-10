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

use civil_server;
use civil_server::{stat_api, Result};

use r2d2_sqlite::SqliteConnectionManager;

#[actix_rt::main]
async fn main() -> Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();

    let sqlite_db = civil_server::env_var_string("SQLITE_DB")?;
    civil_server::db::sqlite_migrations::migration_check(&sqlite_db)?;

    let sqlite_manager = SqliteConnectionManager::file(&sqlite_db);
    let sqlite_pool = r2d2::Pool::new(sqlite_manager)?;

    let user_ids = stat_api::get_all_user_ids(&sqlite_pool)?;
    for user in user_ids {
        let latest_stats = stat_api::generate_stats(&sqlite_pool, user.id)?;
        let last_saved_stats = stat_api::get_last_saved_stats(&sqlite_pool, user.id)?;

        if latest_stats != last_saved_stats {
            stat_api::create_stats(&sqlite_pool, user.id, &latest_stats)?;
        }
    }

    Ok(())
}
