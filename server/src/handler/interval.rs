// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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

use crate::db::SqlitePool;
use crate::db::points as db;
use crate::handler::AuthUser;
use crate::interop::points as interop;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path};

#[derive(serde::Deserialize)]
pub struct YearRangeParam {
    pub lower: i32,
    pub upper: i32,
}

pub async fn get_points(
    sqlite_pool: Data<SqlitePool>,
    params: Path<YearRangeParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let lower = params.lower;
    let upper = params.upper;
    let points = db::all_points_within_interval(&sqlite_pool, user_id, lower, upper).await?;

    Ok(Json(interop::PointsWithinYears {
        lower_year: lower,
        upper_year: upper,
        points,
    }))
}
