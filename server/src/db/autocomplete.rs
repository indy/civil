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
use crate::db::deck_kind::DeckKind;
use crate::error::Result;
use crate::interop::autocomplete as interop;
use crate::interop::Key;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct AutocompleteDeck {
    id: Key,
    name: String,
    kind: DeckKind,
    graph_terminator: bool,
}

impl From<AutocompleteDeck> for interop::Autocomplete {
    fn from(p: AutocompleteDeck) -> interop::Autocomplete {
        interop::Autocomplete {
            id: p.id,
            name: String::from(&p.name),
            resource: p.kind.into(),
            graph_terminator: p.graph_terminator,
        }
    }
}

pub(crate) async fn get_decks(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Autocomplete>> {
    pg::many_from::<AutocompleteDeck, interop::Autocomplete>(
        db_pool,
        "SELECT id, name, kind, graph_terminator
         FROM decks
         WHERE user_id = $1
         ORDER BY name",
        &[&user_id],
    )
    .await
}
