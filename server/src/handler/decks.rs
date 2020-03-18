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

pub mod interop {
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct DeckMention {
        pub id: Key,
        pub name: String,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct DeckReference {
        pub note_id: Key,
        pub id: Key,
        pub name: String,
    }
}

pub mod db {
    use super::interop;
    use crate::interop::Key;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    use crate::error::Result;
    use crate::model::{model_to_node_kind, Model};
    use crate::pg;
    use deadpool_postgres::Pool;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "decks")]
    pub struct Deck {
        pub id: Key,
        pub kind: String,

        pub name: String,
        pub source: Option<String>,

        pub date_id: Option<Key>,
        pub location_id: Option<Key>,

        pub timespan_id: Option<Key>,
        pub location2_id: Option<Key>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "decks")]
    struct DeckMention {
        id: Key,
        name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "decks")]
    struct DeckReference {
        note_id: Key,
        id: Key,
        name: String,
    }

    impl From<DeckMention> for interop::DeckMention {
        fn from(d: DeckMention) -> interop::DeckMention {
            interop::DeckMention {
                id: d.id,
                name: d.name.to_string(),
            }
        }
    }

    impl From<DeckReference> for interop::DeckReference {
        fn from(d: DeckReference) -> interop::DeckReference {
            interop::DeckReference {
                note_id: d.note_id,
                id: d.id,
                name: d.name.to_string(),
            }
        }
    }

    // return all the decks of a certain kind that mention another particular deck.
    // e.g. deck_that_mention(db_pool, Model::HistoricPerson, Model::Subject, subject_id)
    // will return all the people who mention the given subject, ordered by number of references
    //
    pub async fn that_mention(
        db_pool: &Pool,
        source_model: Model,
        mentioned_model: Model,
        mentioned_id: Key,
    ) -> Result<Vec<interop::DeckMention>> {
        let from_kind = model_to_node_kind(source_model);
        let to_kind = model_to_node_kind(mentioned_model);

        let stmt = include_str!("../sql/decks_that_mention.sql");
        let stmt = stmt.replace("$from_kind", from_kind);
        let stmt = stmt.replace("$to_kind", to_kind);

        let mentioned =
            pg::many_from::<DeckMention, interop::DeckMention>(db_pool, &stmt, &[&mentioned_id])
                .await?;

        Ok(mentioned)
    }

    // return all the referenced models in the given deck
    // e.g. referenced_in(db_pool, Model::Subject, subject_id, Model::HistoricPerson)
    // will return all the people mentioned in the given subject
    //
    pub async fn referenced_in(
        db_pool: &Pool,
        model: Model,
        id: Key,
        referenced_model: Model,
    ) -> Result<Vec<interop::DeckReference>> {
        let to_kind = model_to_node_kind(referenced_model);
        let node_kind = model_to_node_kind(model);

        let stmt = include_str!("../sql/decks_referenced.sql");
        let stmt = stmt.replace("$from_kind", node_kind);
        let stmt = stmt.replace("$to_kind", to_kind);

        let referenced =
            pg::many_from::<DeckReference, interop::DeckReference>(db_pool, &stmt, &[&id]).await?;

        Ok(referenced)
    }
}
