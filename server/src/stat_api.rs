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

use crate::db::stats as stats_db;
use crate::db::users as users_db;
use crate::error::Result;
use crate::interop::stats::Stats;
use crate::interop::users::UserId;
use crate::interop::Key;
use deadpool_postgres::Pool;

pub async fn get_all_user_ids(db_pool: &Pool) -> Result<Vec<UserId>> {
    users_db::get_all_user_ids(db_pool).await
}

pub async fn create_stats(db_pool: &Pool, user_id: Key, stats: &Stats) -> Result<()> {
    stats_db::create_stats(db_pool, user_id, stats).await
}

pub async fn get_last_saved_stats(db_pool: &Pool, user_id: Key) -> Result<Stats> {
    stats_db::get_last_saved_stats(db_pool, user_id).await
}

pub async fn generate_stats(db_pool: &Pool, user_id: Key) -> Result<Stats> {
    stats_db::generate_stats(db_pool, user_id).await
}
