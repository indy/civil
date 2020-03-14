// Copyright (C) 2020 Inderjit Gill <email@indy.io>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pub mod db {
    use crate::edge_type::EdgeType;
    use crate::error::Result;
    use crate::interop::Key;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use deadpool_postgres::Transaction;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "edges")]
    struct Edge {
        id: Key,
        annotation: Option<String>,
    }

    pub async fn create_edge(
        tx: &Transaction<'_>,
        from_key: Key,
        to_key: Key,
        edgetype: EdgeType,
    ) -> Result<Key> {
        let (from, to) = edgetype.models();

        let stmt = include_str!("sql/edges_create.sql");
        let stmt = stmt.replace("$from_column", model_to_foreign_key(from));
        let stmt = stmt.replace("$to_column", model_to_foreign_key(to));

        let edge = pg::tx_one::<Edge>(tx, &stmt, &[&from_key, &to_key, &edgetype]).await?;

        Ok(edge.id)
    }

    pub async fn delete_all_edges_for(tx: &Transaction<'_>, model: Model, id: Key) -> Result<()> {
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/edges_delete.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        pg::tx_zero::<Edge>(tx, &stmt, &[&id]).await?;
        Ok(())
    }
}
