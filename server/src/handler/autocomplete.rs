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
use actix_web::web::Data;
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
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
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_people");

    let autocomplete = db::get_people(&db_pool).await?;

    Ok(HttpResponse::Ok().json(autocomplete))
}

pub async fn get_subjects(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subjects");

    let autocomplete = db::get_subjects(&db_pool).await?;

    Ok(HttpResponse::Ok().json(autocomplete))
}

pub mod db {
    use super::interop;
    use crate::error::Result;
    use crate::interop::Key;
    use crate::model::{model_to_node_kind, Model};
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "decks")]
    struct Autocomplete {
        id: Key,
        name: String,
    }

    impl From<Autocomplete> for interop::Autocomplete {
        fn from(p: Autocomplete) -> interop::Autocomplete {
            interop::Autocomplete {
                id: p.id,
                name: p.name,
            }
        }
    }

    pub(super) async fn get_people(db_pool: &Pool) -> Result<Vec<interop::Autocomplete>> {
        get_autocomplete(db_pool, Model::HistoricPerson).await
    }

    pub(super) async fn get_subjects(db_pool: &Pool) -> Result<Vec<interop::Autocomplete>> {
        get_autocomplete(db_pool, Model::Subject).await
    }

    async fn get_autocomplete(db_pool: &Pool, kind: Model) -> Result<Vec<interop::Autocomplete>> {
        let stmt = include_str!("../sql/autocomplete.sql");
        let stmt = stmt.replace("$node_kind", model_to_node_kind(kind)?);

        pg::many_from::<Autocomplete, interop::Autocomplete>(db_pool, &stmt, &[]).await
    }
}
