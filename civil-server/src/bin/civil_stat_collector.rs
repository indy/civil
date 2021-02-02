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

use civil;
use civil::{stat_api, Result};

#[actix_rt::main]
async fn main() -> Result<()> {
    civil::init_dotenv();
    civil::init_tracing();
    let pool = civil::init_postgres_pool().await?;

    let user_ids = stat_api::get_all_user_ids(&pool).await?;
    for user in user_ids {
        let latest_stats = stat_api::generate_stats(&pool, user.id).await?;
        let last_saved_stats = stat_api::get_last_saved_stats(&pool, user.id).await?;

        if latest_stats != last_saved_stats {
            stat_api::create_stats(&pool, user.id, &latest_stats).await?;
        }
    }

    Ok(())
}
