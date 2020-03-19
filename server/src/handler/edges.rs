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

pub mod db {
    use crate::error::Result;
    use crate::interop::{model_to_node_kind, Key, Model};
    use crate::pg;
    use deadpool_postgres::Transaction;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "edges2")]
    struct Edge {
        id: Key,
        annotation: Option<String>,
    }

    pub async fn create_edge_to_note(
        tx: &Transaction<'_>,
        from_model: Model,
        from_key: Key,
        note_key: Key,
    ) -> Result<Key> {
        let from_kind = model_to_node_kind(from_model)?;

        let stmt = include_str!("../sql/edges_create_to_note.sql");
        let stmt = stmt.replace("$from_kind", from_kind);

        let edge = pg::one::<Edge>(tx, &stmt, &[&from_key, &note_key]).await?;

        Ok(edge.id)
    }

    pub async fn delete_all_edges_connected_with_deck(
        tx: &Transaction<'_>,
        deck_id: Key,
    ) -> Result<()> {
        let stmt = include_str!("../sql/edges_delete_deck.sql");

        pg::zero::<Edge>(tx, &stmt, &[&deck_id]).await?;
        Ok(())
    }

    pub async fn delete_all_edges_connected_with_note(tx: &Transaction<'_>, id: Key) -> Result<()> {
        let stmt = include_str!("../sql/edges_delete_note.sql");

        pg::zero::<Edge>(tx, &stmt, &[&id]).await?;
        Ok(())
    }
}
