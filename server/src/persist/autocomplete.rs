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

use super::pg;
use crate::error::Result;
use crate::handler::autocomplete::interop;
use crate::interop::{model_to_deck_kind, Key, Model};
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

pub(crate) async fn get_people(db_pool: &Pool) -> Result<Vec<interop::Autocomplete>> {
    get_autocomplete(db_pool, Model::HistoricPerson).await
}

pub(crate) async fn get_subjects(db_pool: &Pool) -> Result<Vec<interop::Autocomplete>> {
    get_autocomplete(db_pool, Model::Subject).await
}

async fn get_autocomplete(db_pool: &Pool, kind: Model) -> Result<Vec<interop::Autocomplete>> {
    let stmt = include_str!("sql/autocomplete.sql");
    let stmt = stmt.replace("$deck_kind", model_to_deck_kind(kind)?);

    pg::many_from::<Autocomplete, interop::Autocomplete>(db_pool, &stmt, &[]).await
}
