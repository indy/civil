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
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "historic_people")]
    struct Person {
        id: Key,
        name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    struct Subject {
        id: Key,
        name: String,
    }

    impl From<&Person> for interop::Autocomplete {
        fn from(p: &Person) -> interop::Autocomplete {
            interop::Autocomplete {
                id: p.id,
                name: p.name.to_string(),
            }
        }
    }

    impl From<&Subject> for interop::Autocomplete {
        fn from(s: &Subject) -> interop::Autocomplete {
            interop::Autocomplete {
                id: s.id,
                name: s.name.to_string(),
            }
        }
    }

    pub async fn get_people(db_pool: &Pool) -> Result<Vec<interop::Autocomplete>> {
        let stmt = include_str!("sql/autocomplete.sql");
        let stmt = stmt.replace("$table_name", "historic_people");

        let db_people = pg::many::<Person>(db_pool, &stmt, &[]).await?;

        let autocomplete: Vec<interop::Autocomplete> = db_people
            .iter()
            .map(|p| interop::Autocomplete::from(p))
            .collect();

        Ok(autocomplete)
    }

    pub async fn get_subjects(db_pool: &Pool) -> Result<Vec<interop::Autocomplete>> {
        let stmt = include_str!("sql/autocomplete.sql");
        let stmt = stmt.replace("$table_name", "subjects");

        let db_subjects = pg::many::<Subject>(db_pool, &stmt, &[]).await?;

        let autocomplete: Vec<interop::Autocomplete> = db_subjects
            .iter()
            .map(|p| interop::Autocomplete::from(p))
            .collect();

        Ok(autocomplete)
    }
}
