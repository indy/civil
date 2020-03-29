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

use crate::error::Result;
use crate::persist::autocomplete as db;
use actix_web::web::Data;
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use crate::session;

#[allow(unused_imports)]
use tracing::info;

pub mod interop {
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Autocomplete {
        pub id: Key,
        pub name: String,
    }
}

pub async fn get_people(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_people");

    let user_id = session::user_id(&session)?;
    let autocomplete = db::get_people(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(autocomplete))
}

pub async fn get_subjects(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subjects");

    let user_id = session::user_id(&session)?;
    let autocomplete = db::get_subjects(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(autocomplete))
}
