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
use crate::interop::autocomplete as interop;
use crate::interop::{model_to_deck_kind, Key, Model};
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
}

impl From<AutocompleteDeck> for interop::AutocompleteDeck {
    fn from(p: AutocompleteDeck) -> interop::AutocompleteDeck {
        interop::AutocompleteDeck {
            id: p.id,
            name: p.name,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "tags")]
struct AutocompleteTag {
    id: Key,
    name: String,
}

impl From<AutocompleteTag> for interop::AutocompleteTag {
    fn from(p: AutocompleteTag) -> interop::AutocompleteTag {
        interop::AutocompleteTag {
            id: p.id,
            value: String::from(&p.name),
            label: p.name,
        }
    }
}

pub(crate) async fn get_tags(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::AutocompleteTag>> {
    let stmt = include_str!("sql/autocomplete_tags.sql");
    pg::many_from::<AutocompleteTag, interop::AutocompleteTag>(db_pool, &stmt, &[&user_id]).await
}

pub(crate) async fn get_people(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::AutocompleteDeck>> {
    get_autocomplete_deck(db_pool, user_id, Model::HistoricPerson).await
}

pub(crate) async fn get_subjects(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::AutocompleteDeck>> {
    get_autocomplete_deck(db_pool, user_id, Model::Subject).await
}

async fn get_autocomplete_deck(db_pool: &Pool, user_id: Key, kind: Model) -> Result<Vec<interop::AutocompleteDeck>> {
    let stmt = include_str!("sql/autocomplete_decks.sql");
    let stmt = stmt.replace("$deck_kind", model_to_deck_kind(kind)?);

    pg::many_from::<AutocompleteDeck, interop::AutocompleteDeck>(db_pool, &stmt, &[&user_id]).await
}
